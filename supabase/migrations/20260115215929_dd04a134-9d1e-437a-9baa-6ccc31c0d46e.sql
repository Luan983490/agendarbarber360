-- Add city, state, latitude and longitude columns for geolocation search
ALTER TABLE public.barbershops 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Create index for city/state search
CREATE INDEX IF NOT EXISTS idx_barbershops_city_state ON public.barbershops (city, state);

-- Create index for geolocation queries
CREATE INDEX IF NOT EXISTS idx_barbershops_lat_lng ON public.barbershops (latitude, longitude);

-- Create a function to calculate distance using Haversine formula
CREATE OR REPLACE FUNCTION public.calculate_distance_km(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  R CONSTANT DOUBLE PRECISION := 6371; -- Earth's radius in km
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  -- Return null if any coordinate is null
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlon/2) * sin(dlon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Create a function to search barbershops by proximity
CREATE OR REPLACE FUNCTION public.search_barbershops_by_proximity(
  user_lat DOUBLE PRECISION,
  user_lon DOUBLE PRECISION,
  max_distance_km DOUBLE PRECISION DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  image_url TEXT,
  rating NUMERIC,
  total_reviews INTEGER,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.address,
    b.city,
    b.state,
    b.image_url,
    b.rating,
    b.total_reviews,
    b.latitude,
    b.longitude,
    public.calculate_distance_km(user_lat, user_lon, b.latitude, b.longitude) as distance_km
  FROM public.barbershops b
  WHERE b.latitude IS NOT NULL 
    AND b.longitude IS NOT NULL
    AND public.calculate_distance_km(user_lat, user_lon, b.latitude, b.longitude) <= max_distance_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- Create a function to get unique cities from barbershops
CREATE OR REPLACE FUNCTION public.get_barbershop_cities()
RETURNS TABLE (
  city TEXT,
  state TEXT,
  barbershop_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.city,
    b.state,
    COUNT(*) as barbershop_count
  FROM public.barbershops b
  WHERE b.city IS NOT NULL AND b.state IS NOT NULL
  GROUP BY b.city, b.state
  ORDER BY b.city ASC;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;