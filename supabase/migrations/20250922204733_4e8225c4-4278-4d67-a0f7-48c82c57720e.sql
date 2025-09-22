-- Create storage buckets for barbershop and barber images
INSERT INTO storage.buckets (id, name, public) VALUES ('barbershop-images', 'barbershop-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('barber-images', 'barber-images', true);

-- Create policies for barbershop images
CREATE POLICY "Barbershop images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'barbershop-images');

CREATE POLICY "Barbershop owners can upload their images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'barbershop-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Barbershop owners can update their images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'barbershop-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Barbershop owners can delete their images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'barbershop-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policies for barber images
CREATE POLICY "Barber images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'barber-images');

CREATE POLICY "Barbershop owners can upload barber images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'barber-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Barbershop owners can update barber images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'barber-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Barbershop owners can delete barber images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'barber-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add image_url column to barbers table
ALTER TABLE barbers ADD COLUMN image_url TEXT;