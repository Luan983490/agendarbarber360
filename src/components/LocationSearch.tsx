import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Navigation } from "lucide-react";

interface LocationSearchProps {
  location: string;
  onLocationChange: (location: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const LocationSearch = ({ 
  location, 
  onLocationChange, 
  searchQuery, 
  onSearchChange 
}: LocationSearchProps) => {
  return (
    <div className="bg-card rounded-xl p-6 shadow-elegant mb-8">
      <h2 className="text-2xl font-semibold text-foreground mb-6">
        Encontre sua barbearia ideal
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Location Input */}
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Sua localização"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            className="pl-10 bg-input border-border text-foreground"
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 text-primary hover:text-primary/80"
            onClick={() => {
              // TODO: Implement geolocation
              onLocationChange("Localização atual");
            }}
          >
            <Navigation className="h-4 w-4" />
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Nome da barbearia ou serviço"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-input border-border text-foreground"
          />
        </div>

        {/* Search Button */}
        <Button 
          variant="gradient"
          size="default"
        >
          <Search className="mr-2 h-5 w-5" />
          Buscar
        </Button>
      </div>
    </div>
  );
};