-- Enable uuid-ossp extension (needed for uuid_generate_v4)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Also ensure gen_random_uuid works as a fallback by updating the default
-- Check if the bookings table uses uuid_generate_v4 and update to gen_random_uuid
ALTER TABLE public.bookings ALTER COLUMN id SET DEFAULT gen_random_uuid();