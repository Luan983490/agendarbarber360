import { MapPin, Clock, Phone, MessageCircle, CreditCard, Banknote, QrCode, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface BarbershopDetailsSectionProps {
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
}

export const BarbershopDetailsSection = ({ barbershop }: BarbershopDetailsSectionProps) => {
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

  // Parse opening hours for display
  const formatOpeningHours = () => {
    if (!barbershop.opening_hours) return null;
    
    const hours = barbershop.opening_hours;
    
    // Day mapping for the object format with English day names
    const dayKeyMap: Record<string, string> = {
      sunday: "Domingo",
      monday: "Segunda",
      tuesday: "Terça",
      wednesday: "Quarta",
      thursday: "Quinta",
      friday: "Sexta",
      saturday: "Sábado",
    };
    
    // Order of days (Sunday first)
    const dayOrder = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    
    // If it's an array format (by day of week)
    if (Array.isArray(hours)) {
      const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      return hours.map((day: any, index: number) => ({
        day: dayNames[index],
        periods: day.is_day_off 
          ? null 
          : [
              day.period1_start && day.period1_end ? `${day.period1_start} - ${day.period1_end}` : null,
              day.period2_start && day.period2_end ? `${day.period2_start} - ${day.period2_end}` : null,
            ].filter(Boolean)
      }));
    }
    
    // If it's an object format with day names as keys (e.g., { monday: { open: "09:00", close: "18:00" } })
    if (typeof hours === "object") {
      return dayOrder.map((dayKey) => {
        const dayData = hours[dayKey];
        const displayName = dayKeyMap[dayKey];
        
        if (!dayData) {
          return { day: displayName, periods: null };
        }
        
        // Handle "Fechado" format
        if (dayData.open === "Fechado" || dayData.close === "Fechado") {
          return { day: displayName, periods: null };
        }
        
        // Handle open/close format
        if (dayData.open && dayData.close) {
          return {
            day: displayName,
            periods: [`${dayData.open} - ${dayData.close}`]
          };
        }
        
        // Handle period1/period2 format
        const periods = [
          dayData.period1_start && dayData.period1_end ? `${dayData.period1_start} - ${dayData.period1_end}` : null,
          dayData.period2_start && dayData.period2_end ? `${dayData.period2_start} - ${dayData.period2_end}` : null,
        ].filter(Boolean);
        
        return {
          day: displayName,
          periods: periods.length > 0 ? periods : null
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

  if (!hasLocation && !openingHours && !hasContact && !hasPayments && !hasSocials) {
    return null;
  }

  return (
    <div className="space-y-6 py-6">
      <Separator />
      
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
      {openingHours && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.5} />
              <div className="flex-1">
                <h4 className="font-medium text-foreground text-sm">Horário de Funcionamento</h4>
                <div className="mt-2 space-y-1.5">
                  {openingHours.map((day: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{day.day}</span>
                      <span className={cn(
                        "text-right",
                        day.periods ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {day.periods ? day.periods.join(" | ") : "Fechado"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

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
