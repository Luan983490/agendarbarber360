import { useState, useEffect } from "react";
import { BarberShopCard } from "@/components/BarberShopCard";
import { Badge } from "@/components/ui/badge";
import { MapPin, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BarberShopGridProps {
  searchQuery: string;
  activeFilters: string[];
  location: string;
}

interface BarberShop {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviewCount: number;
  distance: string;
  isOpen: boolean;
  priceRange: string;
  specialties: string[];
  nextAvailable: string;
  promotions: string[];
}

export const BarberShopGrid = ({ searchQuery, activeFilters, location }: BarberShopGridProps) => {
  const [barbershops, setBarbershops] = useState<BarberShop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBarbershops();

    // Subscribe to real-time changes in barbershops table
    const channel = supabase
      .channel('barbershops-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'barbershops'
        },
        () => {
          fetchBarbershops();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBarbershops = async () => {
    try {
      const { data, error } = await supabase
        .from('barbershops')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database data to match BarberShop interface
      const transformedData = data?.map(shop => ({
        id: shop.id,
        name: shop.name,
        image: shop.image_url || "/placeholder.svg",
        rating: shop.rating || 0,
        reviewCount: shop.total_reviews || 0,
        distance: "-- km", // This would need geolocation calculation
        isOpen: true, // This would need business hours logic
        priceRange: "$$", // This could be derived from service prices
        specialties: ["Corte", "Barba"], // This could be derived from services
        nextAvailable: "Disponível", // This would need booking availability logic
        promotions: [] // This could be a separate table
      })) || [];

      setBarbershops(transformedData);
    } catch (error) {
      console.error('Erro ao carregar barbearias:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter logic
  const filteredShops = barbershops.filter(shop => {
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
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredShops.map((shop) => (
            <BarberShopCard key={shop.id} barberShop={shop} />
          ))}
        </div>
      )}

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