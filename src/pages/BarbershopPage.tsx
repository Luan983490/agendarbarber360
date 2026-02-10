import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BookingFlow } from "@/components/booking/BookingFlow";
import b360Logo from "@/assets/b360-logo.png";

interface BarbershopData {
  id: string;
  name: string;
  image_url: string | null;
  address: string;
  rating: number | null;
}

const BarbershopPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [barbershop, setBarbershop] = useState<BarbershopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchBarbershop = async () => {
      if (!slug) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("barbershops")
          .select("id, name, image_url, address, rating")
          .eq("slug", slug)
          .single();

        if (fetchError || !data) {
          setError(true);
        } else {
          setBarbershop(data);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchBarbershop();
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
      autoOpen
      onBackFromAutoOpen={() => navigate("/")}
    >
      <div />
    </BookingFlow>
  );
};

export default BarbershopPage;
