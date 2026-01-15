import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  MapPin, 
  Navigation, 
  Building2, 
  Loader2,
  X,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type SearchType = 'name' | 'city' | 'proximity';

interface City {
  city: string;
  state: string;
  barbershop_count: number;
}

interface AdvancedSearchProps {
  searchType: SearchType;
  onSearchTypeChange: (type: SearchType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCity: string | null;
  onCityChange: (city: string | null) => void;
  onProximitySearch: (lat: number, lng: number) => void;
  onClearProximity: () => void;
  isProximityActive: boolean;
}

export const AdvancedSearch = ({
  searchType,
  onSearchTypeChange,
  searchQuery,
  onSearchChange,
  selectedCity,
  onCityChange,
  onProximitySearch,
  onClearProximity,
  isProximityActive,
}: AdvancedSearchProps) => {
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [citySearchOpen, setCitySearchOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  
  const geolocation = useGeolocation();
  
  // Debounce the search query (500ms)
  const debouncedSearchQuery = useDebounce(localSearchQuery, 500);
  
  // Update parent when debounced value changes
  useEffect(() => {
    onSearchChange(debouncedSearchQuery);
  }, [debouncedSearchQuery, onSearchChange]);
  
  // Sync local state with prop
  useEffect(() => {
    if (searchQuery !== localSearchQuery && searchQuery !== debouncedSearchQuery) {
      setLocalSearchQuery(searchQuery);
    }
  }, [searchQuery]);

  // Fetch cities from database
  useEffect(() => {
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        // Try the RPC function first
        const { data, error } = await supabase.rpc('get_barbershop_cities');
        
        if (error) throw error;
        setCities(data || []);
      } catch (error) {
        console.error('Erro ao carregar cidades via RPC:', error);
        // Fallback: fetch unique cities directly
        try {
          const { data } = await supabase
            .from('barbershops')
            .select('city, state')
            .not('city', 'is', null)
            .not('state', 'is', null)
            .order('city');
          
          if (data) {
            const uniqueCities = data.reduce((acc: City[], curr) => {
              const existing = acc.find(c => c.city === curr.city && c.state === curr.state);
              if (existing) {
                existing.barbershop_count++;
              } else if (curr.city && curr.state) {
                acc.push({ city: curr.city, state: curr.state, barbershop_count: 1 });
              }
              return acc;
            }, []);
            setCities(uniqueCities);
          }
        } catch {
          console.error('Fallback city fetch failed');
        }
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, []);

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!citySearchQuery) return cities;
    const query = citySearchQuery.toLowerCase();
    return cities.filter(
      c => c.city?.toLowerCase().includes(query) || 
           c.state?.toLowerCase().includes(query)
    );
  }, [cities, citySearchQuery]);

  // Handle proximity search
  const handleProximityClick = useCallback(() => {
    if (isProximityActive) {
      onClearProximity();
      geolocation.clearLocation();
    } else {
      geolocation.requestLocation();
    }
  }, [isProximityActive, onClearProximity, geolocation]);

  // Trigger proximity search when location is obtained
  useEffect(() => {
    if (geolocation.hasLocation && searchType === 'proximity') {
      onProximitySearch(geolocation.latitude!, geolocation.longitude!);
    }
  }, [geolocation.hasLocation, geolocation.latitude, geolocation.longitude, searchType, onProximitySearch]);

  const handleSearchTypeChange = useCallback((type: SearchType) => {
    onSearchTypeChange(type);
    if (type === 'proximity' && !geolocation.hasLocation && !geolocation.loading) {
      geolocation.requestLocation();
    }
  }, [onSearchTypeChange, geolocation]);

  const handleClearSearch = useCallback(() => {
    setLocalSearchQuery("");
    onSearchChange("");
  }, [onSearchChange]);

  return (
    <div className="bg-card rounded-xl p-6 shadow-elegant mb-8">
      <h2 className="text-2xl font-semibold text-foreground mb-6">
        Encontre sua barbearia ideal
      </h2>

      {/* Search Type Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={searchType === 'name' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSearchTypeChange('name')}
          className="flex items-center gap-2"
        >
          <Search className="h-4 w-4" />
          Por Nome
        </Button>
        <Button
          variant={searchType === 'city' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSearchTypeChange('city')}
          className="flex items-center gap-2"
        >
          <Building2 className="h-4 w-4" />
          Por Cidade
        </Button>
        <Button
          variant={searchType === 'proximity' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleSearchTypeChange('proximity')}
          className="flex items-center gap-2"
        >
          <Navigation className="h-4 w-4" />
          Próximas
        </Button>
      </div>

      {/* Search Input based on type */}
      <div className="space-y-4">
        {searchType === 'name' && (
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Digite o nome da barbearia..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              className="pl-10 bg-input border-border text-foreground"
            />
            {localSearchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2"
                onClick={handleClearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {localSearchQuery !== debouncedSearchQuery && (
              <div className="absolute right-12 top-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}

        {searchType === 'city' && (
          <div className="space-y-3">
            <Popover open={citySearchOpen} onOpenChange={setCitySearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={citySearchOpen}
                  className="w-full justify-between bg-input border-border text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {selectedCity || "Selecione uma cidade..."}
                  </div>
                  {loadingCities ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Buscar cidade..." 
                    value={citySearchQuery}
                    onValueChange={setCitySearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {loadingCities ? "Carregando..." : "Nenhuma cidade encontrada"}
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredCities.map((city) => (
                        <CommandItem
                          key={`${city.city}-${city.state}`}
                          value={`${city.city}/${city.state}`}
                          onSelect={() => {
                            onCityChange(`${city.city}/${city.state}`);
                            setCitySearchOpen(false);
                            setCitySearchQuery("");
                          }}
                        >
                          <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{city.city}/{city.state}</span>
                          <Badge variant="secondary" className="ml-auto">
                            {city.barbershop_count} {city.barbershop_count === 1 ? 'barbearia' : 'barbearias'}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedCity && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selectedCity}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                    onClick={() => onCityChange(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              </div>
            )}
            
            {cities.length === 0 && !loadingCities && (
              <p className="text-sm text-muted-foreground text-center">
                Nenhuma cidade cadastrada ainda. As barbearias precisam completar seus dados de endereço.
              </p>
            )}
          </div>
        )}

        {searchType === 'proximity' && (
          <div className="space-y-4">
            <Button
              variant={isProximityActive ? "secondary" : "default"}
              onClick={handleProximityClick}
              disabled={geolocation.loading}
              className="w-full"
            >
              {geolocation.loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Obtendo localização...
                </>
              ) : isProximityActive ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Limpar busca por proximidade
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4 mr-2" />
                  Usar minha localização
                </>
              )}
            </Button>

            {geolocation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {geolocation.error}
                </AlertDescription>
              </Alert>
            )}

            {isProximityActive && geolocation.hasLocation && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>
                  Mostrando barbearias mais próximas de você
                </span>
              </div>
            )}

            {!isProximityActive && !geolocation.error && !geolocation.loading && (
              <p className="text-sm text-muted-foreground text-center">
                Clique no botão acima para encontrar barbearias próximas a você.
                Será solicitada permissão para acessar sua localização.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
