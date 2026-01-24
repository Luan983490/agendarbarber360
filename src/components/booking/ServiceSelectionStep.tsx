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
    <div className="flex flex-col h-full bg-background">
      {/* Header with barbershop info */}
      <div className="p-4 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
            {/* Logo */}
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
              {barbershop.image ? (
                <img
                  src={barbershop.image}
                  alt={barbershop.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg md:text-xl font-bold text-foreground">
                  {barbershop.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {/* Name and address */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-foreground">
                {barbershop.name}
              </h2>
              {barbershop.address && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                  {barbershop.address}
                </p>
              )}
            </div>
          </div>
          {/* Rating */}
          {barbershop.rating && (
            <div className="flex flex-col items-end flex-shrink-0">
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl md:text-2xl font-bold text-foreground">
                  {barbershop.rating.toFixed(1).replace(".", ",")}
                </span>
                <span className="text-sm text-muted-foreground">/5</span>
              </div>
              <div className="flex gap-0.5 mt-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-3.5 h-3.5 md:w-4 md:h-4",
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
      <div className="px-4 md:px-6 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Busca por serviço"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Services section */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6">
        {/* Collapsible header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 w-full py-3"
        >
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-foreground" />
          )}
          <span className="text-lg font-bold text-foreground">
            Serviços populares
          </span>
          <Badge
            variant="secondary"
            className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-normal"
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
                className="flex items-center justify-between py-4 gap-4"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground text-base">
                    {service.name}
                  </h3>
                </div>
                <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      R$ {service.price.toFixed(2).replace(".", ",")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDuration(service.duration)}
                    </p>
                  </div>
                  <Button
                    onClick={() => onSelectService(service)}
                    className="bg-[#3d9a9b] hover:bg-[#2d7a7b] text-white font-medium px-4 md:px-6 h-9 rounded-md"
                  >
                    Reservar
                  </Button>
                </div>
              </div>
            ))}

            {filteredServices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum serviço encontrado
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
