import { useState, useEffect, useCallback } from "react";
import { BarberShopCard } from "@/components/BarberShopCard";
import { Badge } from "@/components/ui/badge";
import { MapPin, Filter, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calculateDistanceKm, formatDistance } from "@/hooks/useGeolocation";
import { SearchType } from "@/components/AdvancedSearch";

interface BarberShopGridProps {
  searchQuery: string;
  activeFilters: string[];
  location: string;
  searchType?: SearchType;
  selectedCity?: string | null;
  userLatitude?: number | null;
  userLongitude?: number | null;
}

interface BarberShop {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviewCount: number;
  distance: string;
  distanceKm: number | null;
  isOpen: boolean;
  priceRange: string;
  specialties: string[];
  nextAvailable: string;
  promotions: string[];
  city?: string | null;
  state?: string | null;
}

interface DbBarbershop {
  id: string;
  name: string;
  image_url: string | null;
  rating: number | null;
  total_reviews: number | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const BarberShopGrid = ({ 
  searchQuery, 
  activeFilters, 
  location,
  searchType = 'name',
  selectedCity = null,
  userLatitude = null,
  userLongitude = null,
}: BarberShopGridProps) => {
  const [barbershops, setBarbershops] = useState<BarberShop[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBarbershops = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('barbershops')
        .select('id, name, image_url, rating, total_reviews, city, state, latitude, longitude');

      // Filter by city if selected
      if (searchType === 'city' && selectedCity) {
        const [cityName, stateName] = selectedCity.split('/');
        query = query.eq('city', cityName).eq('state', stateName);
      }

      // Filter by name if searching
      if (searchType === 'name' && searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database data to match BarberShop interface
      let transformedData: BarberShop[] = (data as DbBarbershop[] || []).map(shop => {
        let distanceKm: number | null = null;
        
        // Calculate distance if we have user location and shop location
        if (userLatitude && userLongitude && shop.latitude && shop.longitude) {
          distanceKm = calculateDistanceKm(
            userLatitude,
            userLongitude,
            shop.latitude,
            shop.longitude
          );
        }

        return {
          id: shop.id,
          name: shop.name,
          image: shop.image_url || "/placeholder.svg",
          rating: shop.rating || 0,
          reviewCount: shop.total_reviews || 0,
          distance: formatDistance(distanceKm),
          distanceKm,
          isOpen: true,
          priceRange: "$$",
          specialties: ["Corte", "Barba"],
          nextAvailable: "Disponível",
          promotions: [],
          city: shop.city,
          state: shop.state,
        };
      });

      // Sort by distance if proximity search is active
      if (searchType === 'proximity' && userLatitude && userLongitude) {
        transformedData = transformedData
          .filter(shop => shop.distanceKm !== null)
          .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
      }

      setBarbershops(transformedData);
    } catch (error) {
      console.error('Erro ao carregar barbearias:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, searchType, selectedCity, userLatitude, userLongitude]);

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
  }, [fetchBarbershops]);

  // Filter logic
  const filteredShops = barbershops.filter(shop => {
    // For name search without query, show all
    if (searchType === 'name' && searchQuery && !shop.name.toLowerCase().includes(searchQuery.toLowerCase())) {
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

  const getLocationLabel = () => {
    if (searchType === 'city' && selectedCity) {
      return selectedCity;
    }
    if (searchType === 'proximity' && userLatitude && userLongitude) {
      return 'Próximas a você';
    }
    return location;
  };

  return (
    <div>
      {/* Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center space-x-2 mb-2 sm:mb-0">
          <h2 className="text-xl font-semibold text-foreground">
            {filteredShops.length} {filteredShops.length === 1 ? 'barbearia encontrada' : 'barbearias encontradas'}
          </h2>
          {getLocationLabel() && (
            <div className="flex items-center text-muted-foreground">
              {searchType === 'proximity' ? (
                <Navigation className="h-4 w-4 mr-1 text-primary" />
              ) : (
                <MapPin className="h-4 w-4 mr-1" />
              )}
              <span className="text-sm">{getLocationLabel()}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {searchType === 'proximity' && userLatitude && (
            <Badge variant="outline" className="text-primary border-primary">
              <Navigation className="h-3 w-3 mr-1" />
              Ordenado por distância
            </Badge>
          )}
          {searchType !== 'proximity' && (
            <Badge variant="outline" className="text-muted-foreground border-border">
              <Filter className="h-3 w-3 mr-1" />
              Ordenar por distância
            </Badge>
          )}
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

      {!loading && filteredShops.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Nenhuma barbearia encontrada</p>
            <p className="text-sm">
              {searchType === 'proximity' 
                ? 'Nenhuma barbearia cadastrou coordenadas geográficas ainda'
                : 'Tente ajustar os filtros ou a busca'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
