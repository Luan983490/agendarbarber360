import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookingFlow } from "@/components/booking/BookingFlow";
import b360Logo from "@/assets/b360-logo.png";

interface BarbershopData {
  id: string;
  name: string;
  image_url: string | null;
  address: string;
  rating: number | null;
  slug: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  opening_hours: any;
  amenities: string[] | null;
  postal_code: string | null;
  neighborhood: string | null;
  street_number: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  whatsapp: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  payment_methods: string[] | null;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
}

interface Barber {
  id: string;
  name: string;
  specialty?: string;
  image_url?: string;
}

const BarbershopPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rescheduleBookingId = searchParams.get("reschedule") || undefined;
  const [barbershop, setBarbershop] = useState<BarbershopData | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [workingHours, setWorkingHours] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      if (!slug) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        // Step 1: Get barbershop with ALL fields
        const { data: bData, error: bError } = await supabase
          .from("barbershops")
          .select("*")
          .eq("slug", slug)
          .single();

        if (bError || !bData) {
          setError(true);
          setLoading(false);
          return;
        }

        setBarbershop(bData as BarbershopData);

        // Step 2: Fetch services, barbers, and working hours ALL in parallel
        const [servicesResult, barbersResult, hoursResult] = await Promise.all([
          supabase
            .from("services")
            .select("*")
            .eq("barbershop_id", bData.id)
            .eq("is_active", true),
          supabase
            .from("barbers")
            .select("id, name, specialty, image_url")
            .eq("barbershop_id", bData.id)
            .eq("is_active", true),
          supabase
            .from("barber_working_hours")
            .select("barber_id, day_of_week, is_day_off, period1_start, period1_end, period2_start, period2_end, barbers!inner(barbershop_id, is_active)")
            .eq("barbers.barbershop_id", bData.id)
            .eq("barbers.is_active", true)
            .order("day_of_week"),
        ]);

        setServices(servicesResult.data || []);
        setBarbers(barbersResult.data || []);

        // Aggregate working hours: earliest start, latest end per day
        const hours = hoursResult.data || [];
        const dayMap = new Map<number, any>();
        for (const h of hours) {
          const existing = dayMap.get(h.day_of_week);
          if (!existing) {
            dayMap.set(h.day_of_week, { ...h });
          } else {
            if (!h.is_day_off) existing.is_day_off = false;
            if (h.period1_start && (!existing.period1_start || h.period1_start < existing.period1_start)) existing.period1_start = h.period1_start;
            if (h.period1_end && (!existing.period1_end || h.period1_end > existing.period1_end)) existing.period1_end = h.period1_end;
            if (h.period2_start && (!existing.period2_start || h.period2_start < existing.period2_start)) existing.period2_start = h.period2_start;
            if (h.period2_end && (!existing.period2_end || h.period2_end > existing.period2_end)) existing.period2_end = h.period2_end;
          }
        }
        setWorkingHours(Array.from(dayMap.values()).sort((a: any, b: any) => a.day_of_week - b.day_of_week));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <img src={b360Logo} alt="B360" className="h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !barbershop) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <img src={b360Logo} alt="B360" className="h-16 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground">Barbearia não encontrada</h1>
          <p className="text-muted-foreground">O link pode estar incorreto ou a barbearia não está disponível.</p>
          <button
            onClick={() => navigate("/")}
            className="text-primary hover:underline text-sm"
          >
            Voltar para a página inicial
          </button>
        </div>
      </div>
    );
  }

  return (
    <BookingFlow
      barbershop={{
        id: barbershop.id,
        name: barbershop.name,
        image: barbershop.image_url || undefined,
        address: barbershop.address,
        rating: barbershop.rating || undefined,
      }}
      prefetchedServices={services}
      prefetchedBarbers={barbers}
      prefetchedBarbershopDetails={{
        slug: barbershop.slug,
        description: barbershop.description,
        phone: barbershop.phone,
        email: barbershop.email,
        address: barbershop.address,
        opening_hours: barbershop.opening_hours,
        amenities: barbershop.amenities,
        postal_code: barbershop.postal_code,
        neighborhood: barbershop.neighborhood,
        street_number: barbershop.street_number,
        city: barbershop.city,
        state: barbershop.state,
        latitude: barbershop.latitude,
        longitude: barbershop.longitude,
        whatsapp: barbershop.whatsapp,
        instagram_url: barbershop.instagram_url,
        facebook_url: barbershop.facebook_url,
        payment_methods: barbershop.payment_methods,
      }}
      prefetchedWorkingHours={workingHours}
      autoOpen
      onBackFromAutoOpen={() => navigate("/")}
      rescheduleBookingId={rescheduleBookingId}
    >
      <div />
    </BookingFlow>
  );
};

export default BarbershopPage;
