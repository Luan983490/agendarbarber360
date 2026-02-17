import { MapPin, Clock, Phone, MessageCircle, CreditCard, Banknote, QrCode, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BarberWorkingHours {
  day_of_week: number;
  is_day_off: boolean;
  period1_start: string | null;
  period1_end: string | null;
  period2_start: string | null;
  period2_end: string | null;
}

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
          .eq("is_active", true)
          .limit(1);
        
        if (barbers && barbers.length > 0) {
          const { data: hours } = await supabase
            .from("barber_working_hours")
            .select("day_of_week, is_day_off, period1_start, period1_end, period2_start, period2_end")
            .eq("barber_id", barbers[0].id)
            .order("day_of_week");
          
          setWorkingHours(hours || []);
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
            <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
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
            <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
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
              <Phone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
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
                      <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
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
              <CreditCard className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
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
                        <IconComponent className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
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
                  <Instagram className="h-5 w-5" strokeWidth={1.5} />
                </Button>
              )}
              {barbershop.facebook_url && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => window.open(barbershop.facebook_url, "_blank")}
                >
                  <Facebook className="h-5 w-5" strokeWidth={1.5} />
                </Button>
              )}
              {barbershop.whatsapp && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={openWhatsApp}
                >
                  <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
