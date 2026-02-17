import { MapPin, Clock, Phone, CreditCard, Banknote, QrCode, Instagram, Facebook } from "lucide-react";

const WhatsAppIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BarberWorkingHoursRaw {
  barber_id?: string;
  day_of_week: number;
  is_day_off: boolean;
  period1_start: string | null;
  period1_end: string | null;
  period2_start: string | null;
  period2_end: string | null;
}

interface BarberWorkingHours {
  day_of_week: number;
  is_day_off: boolean;
  period1_start: string | null;
  period1_end: string | null;
  period2_start: string | null;
  period2_end: string | null;
}

// Aggregate working hours across all barbers: earliest start, latest end per day
const aggregateWorkingHours = (hours: BarberWorkingHoursRaw[]): BarberWorkingHours[] => {
  const dayMap = new Map<number, BarberWorkingHours>();

  for (const h of hours) {
    const existing = dayMap.get(h.day_of_week);
    if (!existing) {
      dayMap.set(h.day_of_week, {
        day_of_week: h.day_of_week,
        is_day_off: h.is_day_off,
        period1_start: h.period1_start,
        period1_end: h.period1_end,
        period2_start: h.period2_start,
        period2_end: h.period2_end,
      });
    } else {
      // If any barber works this day, it's not a day off
      if (!h.is_day_off) {
        existing.is_day_off = false;
      }
      // Use earliest start and latest end for each period
      if (h.period1_start && (!existing.period1_start || h.period1_start < existing.period1_start)) {
        existing.period1_start = h.period1_start;
      }
      if (h.period1_end && (!existing.period1_end || h.period1_end > existing.period1_end)) {
        existing.period1_end = h.period1_end;
      }
      if (h.period2_start && (!existing.period2_start || h.period2_start < existing.period2_start)) {
        existing.period2_start = h.period2_start;
      }
      if (h.period2_end && (!existing.period2_end || h.period2_end > existing.period2_end)) {
        existing.period2_end = h.period2_end;
      }
    }
  }

  return Array.from(dayMap.values()).sort((a, b) => a.day_of_week - b.day_of_week);
};

interface BarbershopDetailsSectionProps {
  barbershopId: string;
  barbershop: {
    address?: string;
    street_number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    whatsapp?: string;
    opening_hours?: any;
    payment_methods?: string[];
    instagram_url?: string;
    facebook_url?: string;
  };
  /** Compact mode: removes top separator and vertical padding (for desktop sidebar) */
  compact?: boolean;
  /** Pre-fetched working hours to avoid secondary fetch delay */
  prefetchedWorkingHours?: BarberWorkingHours[] | null;
}

export const BarbershopDetailsSection = ({ barbershopId, barbershop, compact = false, prefetchedWorkingHours }: BarbershopDetailsSectionProps) => {
  const [workingHours, setWorkingHours] = useState<BarberWorkingHours[] | null>(prefetchedWorkingHours ?? null);
  const [loadingHours, setLoadingHours] = useState(prefetchedWorkingHours === undefined);

  // Sync pre-fetched data when it arrives
  useEffect(() => {
    if (prefetchedWorkingHours !== undefined) {
      setWorkingHours(prefetchedWorkingHours);
      setLoadingHours(false);
    }
  }, [prefetchedWorkingHours]);

  // Only fetch independently if no prefetched data was provided
  useEffect(() => {
    if (prefetchedWorkingHours !== undefined) return; // skip if parent provides data

    const fetchWorkingHours = async () => {
      if (!barbershopId) {
        setLoadingHours(false);
        return;
      }
      
      setLoadingHours(true);
      try {
        const { data: barbers } = await supabase
          .from("barbers")
          .select("id")
          .eq("barbershop_id", barbershopId)
          .eq("is_active", true);
        
        if (barbers && barbers.length > 0) {
          const barberIds = barbers.map(b => b.id);
          const { data: hours } = await supabase
            .from("barber_working_hours")
            .select("barber_id, day_of_week, is_day_off, period1_start, period1_end, period2_start, period2_end")
            .in("barber_id", barberIds)
            .order("day_of_week");
          
          // Aggregate: for each day, use earliest start and latest end across all barbers
          const aggregated = aggregateWorkingHours(hours || []);
          setWorkingHours(aggregated);
        } else {
          setWorkingHours([]);
        }
      } catch (error) {
        console.error("Error fetching working hours:", error);
        setWorkingHours([]);
      } finally {
        setLoadingHours(false);
      }
    };
    
    fetchWorkingHours();
  }, [barbershopId, prefetchedWorkingHours]);

  // Build complete address
  const buildFullAddress = () => {
    const parts: string[] = [];
    
    if (barbershop.address) {
      let addressPart = barbershop.address;
      if (barbershop.street_number) {
        addressPart += `, ${barbershop.street_number}`;
      }
      parts.push(addressPart);
    }
    
    if (barbershop.neighborhood) {
      parts.push(barbershop.neighborhood);
    }
    
    if (barbershop.city && barbershop.state) {
      parts.push(`${barbershop.city} - ${barbershop.state}`);
    } else if (barbershop.city) {
      parts.push(barbershop.city);
    }
    
    if (barbershop.postal_code) {
      parts.push(`CEP: ${barbershop.postal_code}`);
    }
    
    return parts.join(", ");
  };

  // Open Google Maps
  const openMaps = () => {
    const address = buildFullAddress();
    if (barbershop.latitude && barbershop.longitude) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${barbershop.latitude},${barbershop.longitude}`,
        "_blank"
      );
    } else if (address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
        "_blank"
      );
    }
  };

  // Format phone for WhatsApp
  const openWhatsApp = () => {
    const number = barbershop.whatsapp || barbershop.phone;
    if (number) {
      const cleanNumber = number.replace(/\D/g, "");
      const formattedNumber = cleanNumber.startsWith("55") ? cleanNumber : `55${cleanNumber}`;
      window.open(`https://wa.me/${formattedNumber}`, "_blank");
    }
  };

  // Call phone
  const callPhone = () => {
    if (barbershop.phone) {
      window.open(`tel:${barbershop.phone}`, "_blank");
    }
  };

  // Format time string (remove seconds if present)
  const formatTime = (time: string | null) => {
    if (!time) return null;
    // Remove seconds if present (e.g., "09:00:00" -> "09:00")
    return time.substring(0, 5);
  };

  // Parse opening hours from barber_working_hours table, with fallback to barbershop.opening_hours JSON
  const formatOpeningHours = () => {
    // Try barber_working_hours first
    if (workingHours && workingHours.length > 0) {
      const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      
      return workingHours.map((day) => {
        const displayName = dayNames[day.day_of_week];
        
        if (day.is_day_off) {
          return { day: displayName, periods: null };
        }
        
        const periods = [
          day.period1_start && day.period1_end 
            ? `${formatTime(day.period1_start)} - ${formatTime(day.period1_end)}` 
            : null,
          day.period2_start && day.period2_end 
            ? `${formatTime(day.period2_start)} - ${formatTime(day.period2_end)}` 
            : null,
        ].filter(Boolean);
        
        return {
          day: displayName,
          periods: periods.length > 0 ? periods : null
        };
      });
    }

    // Fallback: use opening_hours JSON from barbershops table
    if (barbershop.opening_hours && typeof barbershop.opening_hours === 'object') {
      const dayMapping: Record<string, string> = {
        sunday: "Domingo",
        monday: "Segunda",
        tuesday: "Terça",
        wednesday: "Quarta",
        thursday: "Quinta",
        friday: "Sexta",
        saturday: "Sábado",
      };
      const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

      return dayOrder.map((key) => {
        const dayData = barbershop.opening_hours?.[key];
        const displayName = dayMapping[key];

        if (!dayData || dayData.open === "Fechado" || dayData.close === "Fechado") {
          return { day: displayName, periods: null };
        }

        return {
          day: displayName,
          periods: [`${dayData.open} - ${dayData.close}`],
        };
      });
    }

    return null;
  };

  // Payment methods mapping
  const paymentMethodsConfig = {
    pix: { icon: QrCode, label: "Pix" },
    credit_card: { icon: CreditCard, label: "Cartão de Crédito" },
    debit_card: { icon: CreditCard, label: "Cartão de Débito" },
    cash: { icon: Banknote, label: "Dinheiro" },
  };

  const fullAddress = buildFullAddress();
  const openingHours = formatOpeningHours();
  const hasLocation = fullAddress || (barbershop.latitude && barbershop.longitude);
  const hasContact = barbershop.phone || barbershop.whatsapp;
  const hasPayments = barbershop.payment_methods && barbershop.payment_methods.length > 0;
  const hasSocials = barbershop.instagram_url || barbershop.facebook_url || barbershop.whatsapp;

  if (!hasLocation && !hasContact && !hasPayments && !hasSocials && !loadingHours && (!workingHours || workingHours.length === 0)) {
    return null;
  }

  return (
    <div className={cn("space-y-6", compact ? "py-0" : "py-6")}>
      {!compact && <Separator />}
      
      {/* Location Section */}
      {hasLocation && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" strokeWidth={1.5} style={{ color: "hsl(45, 60%, 28%)" }} />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground text-sm">Localização</h4>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {fullAddress || "Localização disponível no mapa"}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={openMaps}
                className="mt-3 gap-2"
              >
                <MapPin className="h-4 w-4" strokeWidth={1.5} />
                Abrir no Mapa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Opening Hours Section */}
      <>
        <Separator />
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 mt-0.5 flex-shrink-0" strokeWidth={1.5} style={{ color: "hsl(45, 60%, 28%)" }} />
            <div className="flex-1">
              <h4 className="font-medium text-foreground text-sm">Horário de Funcionamento</h4>
              {loadingHours ? (
                <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
              ) : openingHours && openingHours.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  {openingHours.map((day: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{day.day}</span>
                      <div className={cn(
                        "text-right flex flex-col",
                        day.periods ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {day.periods ? day.periods.map((period: string, i: number) => (
                          <span key={i}>{period}</span>
                        )) : <span>Fechado</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">Horário não informado</p>
              )}
            </div>
          </div>
        </div>
      </>

      {/* Contact Section */}
      {hasContact && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 mt-0.5 flex-shrink-0" strokeWidth={1.5} style={{ color: "hsl(45, 60%, 28%)" }} />
              <div className="flex-1">
                <h4 className="font-medium text-foreground text-sm">Contato</h4>
                <div className="flex flex-wrap gap-2 mt-3">
                  {barbershop.phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={callPhone}
                      className="gap-2"
                    >
                      <Phone className="h-4 w-4" strokeWidth={1.5} />
                      Ligar
                    </Button>
                  )}
                  {(barbershop.whatsapp || barbershop.phone) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openWhatsApp}
                      className="gap-2"
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Payment Methods Section */}
      {hasPayments && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 mt-0.5 flex-shrink-0" strokeWidth={1.5} style={{ color: "hsl(45, 60%, 28%)" }} />
              <div className="flex-1">
                <h4 className="font-medium text-foreground text-sm">Formas de Pagamento</h4>
                <div className="flex flex-wrap gap-3 mt-3">
                  {barbershop.payment_methods?.map((method) => {
                    const config = paymentMethodsConfig[method as keyof typeof paymentMethodsConfig];
                    if (!config) return null;
                    const IconComponent = config.icon;
                    return (
                      <div
                        key={method}
                        className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg"
                      >
                        <IconComponent className="h-4 w-4" strokeWidth={1.5} style={{ color: "hsl(45, 60%, 28%)" }} />
                        <span className="text-sm text-foreground">{config.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Social Media Section */}
      {hasSocials && (
        <>
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium text-foreground text-sm">Redes Sociais</h4>
            <div className="flex gap-3">
              {barbershop.instagram_url && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => window.open(barbershop.instagram_url, "_blank")}
                >
                  <Instagram className="h-5 w-5" strokeWidth={1.5} style={{ color: "hsl(45, 60%, 28%)" }} />
                </Button>
              )}
              {barbershop.facebook_url && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => window.open(barbershop.facebook_url, "_blank")}
                >
                  <Facebook className="h-5 w-5" strokeWidth={1.5} style={{ color: "hsl(45, 60%, 28%)" }} />
                </Button>
              )}
              {barbershop.whatsapp && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={openWhatsApp}
                >
                  <WhatsAppIcon className="h-5 w-5" style={{ color: "hsl(45, 60%, 28%)" }} />
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
