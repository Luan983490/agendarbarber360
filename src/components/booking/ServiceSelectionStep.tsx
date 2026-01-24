import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronDown, ChevronUp, Star, MapPin, Clock } from "lucide-react";
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
  onBack,
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
    <div className="flex flex-col h-full">
      {/* Header with barbershop info */}
      <div className="flex items-start gap-4 p-4 border-b border-border">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {barbershop.image ? (
            <img
              src={barbershop.image}
              alt={barbershop.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-foreground">
              {barbershop.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground truncate">
              {barbershop.name}
            </h2>
            {barbershop.rating && (
              <div className="flex items-center gap-1 ml-2">
                <span className="text-lg font-bold text-foreground">
                  {barbershop.rating.toFixed(1)}
                </span>
                <span className="text-muted-foreground text-sm">/5</span>
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "w-3.5 h-3.5",
                        i < Math.floor(barbershop.rating || 0)
                          ? "text-primary fill-primary"
                          : "text-muted-foreground"
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          {barbershop.address && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {barbershop.address}
            </p>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Busca por serviço"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Services section */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Collapsible header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 w-full mb-4"
        >
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-foreground" />
          ) : (
            <ChevronUp className="w-5 h-5 text-foreground" />
          )}
          <span className="text-lg font-bold text-foreground">
            Serviços populares
          </span>
          <Badge
            variant="secondary"
            className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs"
          >
            {filteredServices.length} serviços
          </Badge>
        </button>

        {/* Services list */}
        {isExpanded && (
          <div className="space-y-0 divide-y divide-border">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between py-4"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="font-medium text-foreground">{service.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-base font-semibold text-foreground">
                      R$ {service.price.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(service.duration)}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => onSelectService(service)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6"
                >
                  Reservar
                </Button>
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
