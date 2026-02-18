import { useState, useEffect, useCallback, useMemo } from "react";
import { BarberShopCard } from "@/components/BarberShopCard";
import { Badge } from "@/components/ui/badge";
import { MapPin, SlidersHorizontal, Compass, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { calculateDistanceKm, formatDistance } from "@/hooks/useGeolocation";
import { SearchType } from "@/components/AdvancedSearch";

/**
 * Check if a barbershop is currently open based on its barbers' working hours.
 * Returns true if ANY active barber is currently working.
 */
const checkIsOpenNow = (
  workingHours: { day_of_week: number; is_day_off: boolean; period1_start: string | null; period1_end: string | null; period2_start: string | null; period2_end: string | null }[]
): boolean => {
  const now = new Date();
  const currentDay = now.getDay(); // 0=Sunday
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const todayHours = workingHours.filter(wh => wh.day_of_week === currentDay && !wh.is_day_off);
  
  return todayHours.some(wh => {
    if (wh.period1_start && wh.period1_end && currentTime >= wh.period1_start && currentTime < wh.period1_end) return true;
    if (wh.period2_start && wh.period2_end && currentTime >= wh.period2_start && currentTime < wh.period2_end) return true;
    return false;
  });
};

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
  address?: string | null;
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
  address: string | null;
}

// Minimum characters to trigger name search
const MIN_SEARCH_CHARS = 3;
// Maximum distance for proximity search (in km)
const MAX_PROXIMITY_DISTANCE_KM = 40;

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
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Check if there's an active search (name search requires 3+ characters)
  const isSearchActive = useMemo(() => {
    if (searchType === 'name' && searchQuery && searchQuery.trim().length >= MIN_SEARCH_CHARS) {
      return true;
    }
    if (searchType === 'city' && selectedCity) {
      return true;
    }
    if (searchType === 'proximity' && userLatitude && userLongitude) {
      return true;
    }
    return false;
  }, [searchType, searchQuery, selectedCity, userLatitude, userLongitude]);

  const fetchBarbershops = useCallback(async () => {
    // Don't fetch if no search is active
    if (!isSearchActive) {
      setBarbershops([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      let query = supabase
        .from('barbershops')
        .select('id, name, image_url, rating, total_reviews, city, state, latitude, longitude, address');

      // Filter by city if selected
      if (searchType === 'city' && selectedCity) {
        const [cityName, stateName] = selectedCity.split('/');
        query = query
          .eq('city', cityName.trim())
          .eq('state', stateName.trim());
      }

      // Filter by name if searching (using ilike for partial match)
      if (searchType === 'name' && searchQuery && searchQuery.trim()) {
        query = query.ilike('name', `%${searchQuery.trim()}%`);
      }

      // For proximity search, only get barbershops with coordinates
      if (searchType === 'proximity' && userLatitude && userLongitude) {
        query = query
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;

      const shopIds = (data as DbBarbershop[] || []).map(s => s.id);

      // Fetch working hours for all barbershops' active barbers
      let workingHoursMap: Record<string, any[]> = {};
      if (shopIds.length > 0) {
        const { data: whData } = await supabase
          .from('barber_working_hours')
          .select('barber_id, day_of_week, is_day_off, period1_start, period1_end, period2_start, period2_end, barbers!inner(barbershop_id, is_active)')
          .in('barbers.barbershop_id', shopIds)
          .eq('barbers.is_active', true);

        if (whData) {
          for (const wh of whData) {
            const bsId = (wh as any).barbers?.barbershop_id;
            if (bsId) {
              if (!workingHoursMap[bsId]) workingHoursMap[bsId] = [];
              workingHoursMap[bsId].push(wh);
            }
          }
        }
      }

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

        const shopHours = workingHoursMap[shop.id] || [];
        const isOpen = checkIsOpenNow(shopHours);

        return {
          id: shop.id,
          name: shop.name,
          image: shop.image_url || "/placeholder.svg",
          rating: shop.rating || 0,
          reviewCount: shop.total_reviews || 0,
          distance: formatDistance(distanceKm),
          distanceKm,
          isOpen,
          priceRange: "$$",
          specialties: ["Corte", "Barba"],
          nextAvailable: "Disponível",
          promotions: [],
          city: shop.city,
          state: shop.state,
          address: shop.address,
        };
      });

      // Filter by max distance and sort if proximity search is active
      if (searchType === 'proximity' && userLatitude && userLongitude) {
        transformedData = transformedData
          .filter(shop => shop.distanceKm !== null && shop.distanceKm <= MAX_PROXIMITY_DISTANCE_KM)
          .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
      }

      setBarbershops(transformedData);
    } catch (error) {
      console.error('Erro ao carregar barbearias:', error);
      setBarbershops([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, searchType, selectedCity, userLatitude, userLongitude, isSearchActive]);

  useEffect(() => {
    fetchBarbershops();

    // Only subscribe to real-time changes if there's an active search
    if (!isSearchActive) return;

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
  }, [fetchBarbershops, isSearchActive]);

  // Apply additional filters (activeFilters)
  const filteredShops = useMemo(() => {
    return barbershops.filter(shop => {
      if (activeFilters.includes("open_now") && !shop.isOpen) {
        return false;
      }
      
      if (activeFilters.includes("highly_rated") && shop.rating < 4.7) {
        return false;
      }
      
      return true;
    });
  }, [barbershops, activeFilters]);

  const getLocationLabel = () => {
    if (searchType === 'city' && selectedCity) {
      return selectedCity;
    }
    if (searchType === 'proximity' && userLatitude && userLongitude) {
      return 'Próximas a você';
    }
    return location;
  };

  const getEmptyMessage = () => {
    if (searchType === 'name' && searchQuery) {
      if (searchQuery.trim().length < MIN_SEARCH_CHARS) {
        return `Digite pelo menos ${MIN_SEARCH_CHARS} letras para buscar`;
      }
      return `Nenhuma barbearia encontrada com "${searchQuery}"`;
    }
    if (searchType === 'city' && selectedCity) {
      return `Nenhuma barbearia encontrada em ${selectedCity}`;
    }
    if (searchType === 'proximity') {
      return `Nenhuma barbearia encontrada em um raio de ${MAX_PROXIMITY_DISTANCE_KM}km`;
    }
    return 'Nenhuma barbearia cadastrada ainda';
  };

  // Show initial placeholder when no search is active
  if (!isSearchActive && !hasSearched) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
          <Search className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Encontre sua barbearia
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Use os filtros acima para buscar por nome (mínimo {MIN_SEARCH_CHARS} letras), cidade ou encontrar as barbearias mais próximas de você (até {MAX_PROXIMITY_DISTANCE_KM}km).
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center space-x-2 mb-2 sm:mb-0">
          <h2 className="text-xl font-semibold text-foreground">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Buscando...
              </span>
            ) : (
              `${filteredShops.length} ${filteredShops.length === 1 ? 'barbearia encontrada' : 'barbearias encontradas'}`
            )}
          </h2>
          {getLocationLabel() && !loading && (
            <div className="flex items-center text-muted-foreground">
              {searchType === 'proximity' ? (
                <Compass className="h-4 w-4 mr-1 text-primary" />
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
              <Compass className="h-3 w-3 mr-1" />
              Até {MAX_PROXIMITY_DISTANCE_KM}km · Por distância
            </Badge>
          )}
          {searchType !== 'proximity' && filteredShops.length > 0 && (
            <Badge variant="outline" className="text-muted-foreground border-border">
              <SlidersHorizontal className="h-3 w-3 mr-1" />
              Ordenado por nome
            </Badge>
          )}
        </div>
      </div>

      {/* Grid of Barbershops */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredShops.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredShops.map((shop) => (
            <BarberShopCard key={shop.id} barberShop={shop} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">{getEmptyMessage()}</p>
            <p className="text-sm mt-2">
              {searchType === 'proximity' 
                ? `As barbearias precisam estar em um raio de ${MAX_PROXIMITY_DISTANCE_KM}km e ter coordenadas cadastradas.`
                : searchType === 'name' && searchQuery.trim().length < MIN_SEARCH_CHARS
                  ? ''
                  : 'Tente ajustar os filtros ou fazer uma busca diferente.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
