import { useState, useCallback, useRef } from 'react';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
  city: string;
  state: string;
  postalCode: string;
  address: string;
}

interface UseGeocodeResult {
  geocode: (address: string) => Promise<GeocodeResult | null>;
  reverseGeocode: (lat: number, lon: number) => Promise<GeocodeResult | null>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

// Nominatim API (OpenStreetMap) - Free and no API key required
const NOMINATIM_API = 'https://nominatim.openstreetmap.org';

// Brazilian states mapping (full name to abbreviation)
const BRAZILIAN_STATES: Record<string, string> = {
  'acre': 'AC',
  'alagoas': 'AL',
  'amapá': 'AP',
  'amazonas': 'AM',
  'bahia': 'BA',
  'ceará': 'CE',
  'distrito federal': 'DF',
  'espírito santo': 'ES',
  'goiás': 'GO',
  'maranhão': 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  'pará': 'PA',
  'paraíba': 'PB',
  'paraná': 'PR',
  'pernambuco': 'PE',
  'piauí': 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  'rondônia': 'RO',
  'roraima': 'RR',
  'santa catarina': 'SC',
  'são paulo': 'SP',
  'sergipe': 'SE',
  'tocantins': 'TO',
};

const normalizeStateName = (state: string): string => {
  const normalized = state.toLowerCase().trim();
  // If it's already an abbreviation (2 chars), return uppercase
  if (normalized.length === 2) {
    return normalized.toUpperCase();
  }
  // Look up in mapping
  return BRAZILIAN_STATES[normalized] || state.toUpperCase().substring(0, 2);
};

const parseNominatimResult = (data: any): GeocodeResult | null => {
  if (!data || !data.lat || !data.lon) return null;

  const address = data.address || {};
  
  // Extract city - Nominatim uses different fields depending on location
  const city = address.city || 
               address.town || 
               address.village || 
               address.municipality || 
               address.county ||
               '';

  // Extract state
  const rawState = address.state || address.region || '';
  const state = normalizeStateName(rawState);

  // Extract postal code
  const postalCode = address.postcode || '';

  // Build street address
  const streetParts = [
    address.road || address.street,
    address.house_number,
    address.suburb || address.neighbourhood
  ].filter(Boolean);
  
  const streetAddress = streetParts.join(', ') || data.display_name.split(',')[0];

  return {
    latitude: parseFloat(data.lat),
    longitude: parseFloat(data.lon),
    displayName: data.display_name,
    city,
    state,
    postalCode: postalCode.replace(/\D/g, ''),
    address: streetAddress,
  };
};

export const useGeocode = (): UseGeocodeResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const geocode = useCallback(async (address: string): Promise<GeocodeResult | null> => {
    if (!address || address.trim().length < 5) {
      setError('Endereço muito curto para buscar');
      return null;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // Add Brazil to improve results
      const searchQuery = address.includes('Brasil') ? address : `${address}, Brasil`;
      
      const params = new URLSearchParams({
        q: searchQuery,
        format: 'json',
        addressdetails: '1',
        limit: '1',
        countrycodes: 'br',
      });

      const response = await fetch(`${NOMINATIM_API}/search?${params}`, {
        headers: {
          'Accept-Language': 'pt-BR',
          'User-Agent': 'Barber360 App',
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar endereço');
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        setError('Endereço não encontrado. Verifique e tente novamente.');
        return null;
      }

      const result = parseNominatimResult(data[0]);
      
      if (!result) {
        setError('Não foi possível processar o endereço encontrado');
        return null;
      }

      return result;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return null; // Request was cancelled, no error
      }
      const errorMessage = err.message || 'Erro ao buscar coordenadas do endereço';
      setError(errorMessage);
      console.error('Geocoding error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lon: number): Promise<GeocodeResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        format: 'json',
        addressdetails: '1',
      });

      const response = await fetch(`${NOMINATIM_API}/reverse?${params}`, {
        headers: {
          'Accept-Language': 'pt-BR',
          'User-Agent': 'Barber360 App',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar endereço');
      }

      const data = await response.json();

      if (!data) {
        setError('Endereço não encontrado para estas coordenadas');
        return null;
      }

      const result = parseNominatimResult(data);
      
      if (!result) {
        setError('Não foi possível processar o endereço');
        return null;
      }

      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao buscar endereço das coordenadas';
      setError(errorMessage);
      console.error('Reverse geocoding error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    geocode,
    reverseGeocode,
    loading,
    error,
    clearError,
  };
};
