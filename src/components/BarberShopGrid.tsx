import { BarberShopCard } from "@/components/BarberShopCard";
import { Badge } from "@/components/ui/badge";
import { MapPin, Filter } from "lucide-react";

interface BarberShopGridProps {
  searchQuery: string;
  activeFilters: string[];
  location: string;
}

// Mock data for demonstration
const mockBarberShops = [
  {
    id: "1",
    name: "Barbearia Dom Corte",
    image: "/placeholder.svg",
    rating: 4.8,
    reviewCount: 127,
    distance: "0.5 km",
    isOpen: true,
    priceRange: "$$",
    specialties: ["Corte masculino", "Barba", "Tratamento capilar"],
    nextAvailable: "14:30",
    promotions: ["20% OFF primeiro agendamento"]
  },
  {
    id: "2", 
    name: "Studio Masculino Elite",
    image: "/placeholder.svg",
    rating: 4.9,
    reviewCount: 89,
    distance: "1.2 km",
    isOpen: true,
    priceRange: "$$$",
    specialties: ["Corte premium", "Barba", "Relaxamento"],
    nextAvailable: "15:00",
    promotions: []
  },
  {
    id: "3",
    name: "Barber Shop Classic",
    image: "/placeholder.svg", 
    rating: 4.6,
    reviewCount: 203,
    distance: "2.1 km",
    isOpen: false,
    priceRange: "$",
    specialties: ["Corte tradicional", "Barba", "Sobrancelha"],
    nextAvailable: "Amanhã 09:00",
    promotions: ["Pacote corte + barba"]
  },
  {
    id: "4",
    name: "Gentleman's Choice",
    image: "/placeholder.svg",
    rating: 4.7,
    reviewCount: 156,
    distance: "0.8 km", 
    isOpen: true,
    priceRange: "$$",
    specialties: ["Corte moderno", "Barba", "Hidratação"],
    nextAvailable: "16:15",
    promotions: []
  }
];

export const BarberShopGrid = ({ searchQuery, activeFilters, location }: BarberShopGridProps) => {
  // Filter logic (simplified for demo)
  const filteredShops = mockBarberShops.filter(shop => {
    if (searchQuery && !shop.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    if (activeFilters.includes("open_now") && !shop.isOpen) {
      return false;
    }
    
    if (activeFilters.includes("highly_rated") && shop.rating < 4.7) {
      return false;
    }
    
    return true;
  });

  return (
    <div>
      {/* Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center space-x-2 mb-2 sm:mb-0">
          <h2 className="text-xl font-semibold text-foreground">
            {filteredShops.length} barbearias encontradas
          </h2>
          {location && (
            <div className="flex items-center text-muted-foreground">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-sm">{location}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-muted-foreground border-border">
            <Filter className="h-3 w-3 mr-1" />
            Ordenar por distância
          </Badge>
        </div>
      </div>

      {/* Grid of Barbershops */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredShops.map((shop) => (
          <BarberShopCard key={shop.id} barberShop={shop} />
        ))}
      </div>

      {filteredShops.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Nenhuma barbearia encontrada</p>
            <p className="text-sm">Tente ajustar os filtros ou a localização</p>
          </div>
        </div>
      )}
    </div>
  );
};