import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, ChevronRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
}

interface ServiceSelectionStepProps {
  barbershop: {
    id: string;
    name: string;
    address?: string;
    image?: string;
    rating?: number;
  };
  services: Service[];
  onSelectService: (service: Service) => void;
  onBack: () => void;
}

export const ServiceSelectionStep = ({
  barbershop,
  services,
  onSelectService,
}: ServiceSelectionStepProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header with barbershop info - max width container for desktop */}
      <div className="w-full max-w-4xl mx-auto px-4 md:px-8 pt-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Logo + Name + Address */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Logo */}
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
              {barbershop.image ? (
                <img
                  src={barbershop.image}
                  alt={barbershop.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl md:text-2xl font-bold text-foreground">
                  {barbershop.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {/* Name and address */}
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">
                {barbershop.name}
              </h2>
              {barbershop.address && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {barbershop.address}
                </p>
              )}
            </div>
          </div>

          {/* Right: Rating */}
          {barbershop.rating && (
            <div className="flex flex-col items-end flex-shrink-0 pt-1">
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl md:text-3xl font-bold text-foreground">
                  {barbershop.rating.toFixed(1).replace(".", ",")}
                </span>
                <span className="text-sm text-muted-foreground">/5</span>
              </div>
              <div className="flex gap-0.5 mt-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-4 h-4",
                      i < Math.floor(barbershop.rating || 0)
                        ? "text-amber-500 fill-amber-500"
                        : "text-muted-foreground"
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="w-full max-w-4xl mx-auto px-4 md:px-8 pb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Busca por serviço"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-card border-border text-foreground placeholder:text-muted-foreground rounded-lg"
          />
        </div>
      </div>

      {/* Services section */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-4xl mx-auto px-4 md:px-8">
          {/* Collapsible header */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3 w-full py-4"
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-foreground" />
            )}
            <span className="text-lg md:text-xl font-bold text-foreground">
              Serviços populares
            </span>
            <Badge
              variant="secondary"
              className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-normal"
            >
              {filteredServices.length} serviços
            </Badge>
          </button>

          {/* Services list */}
          {isExpanded && (
            <div className="divide-y divide-border">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between py-5 gap-4"
                >
                  {/* Service name - left aligned, takes available space */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground text-base md:text-lg">
                      {service.name}
                    </h3>
                  </div>

                  {/* Price + Duration + Button - right aligned */}
                  <div className="flex items-center gap-4 md:gap-6 flex-shrink-0">
                    <div className="text-right">
                      <p className="font-semibold text-foreground text-base md:text-lg">
                        R$ {service.price.toFixed(2).replace(".", ",")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDuration(service.duration)}
                      </p>
                    </div>
                    <Button
                      onClick={() => onSelectService(service)}
                      className="bg-[#3d9a9b] hover:bg-[#2d8a8b] text-white font-medium px-5 md:px-6 h-10 rounded-md"
                    >
                      Reservar
                    </Button>
                  </div>
                </div>
              ))}

              {filteredServices.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum serviço encontrado
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
