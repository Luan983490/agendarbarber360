import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Store, MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import ImageUpload from './ImageUpload';
import { barbershopCreateSchema, validateWithSchema, formatValidationErrors, sanitizeString } from '@/lib/validation-schemas';
import { useGeocode, GeocodeResult } from '@/hooks/useGeocode';
import { useDebounce } from '@/hooks/useDebounce';

interface BarbershopSetupProps {
  onBarbershopCreated: () => void;
}

const BarbershopSetup = ({ onBarbershopCreated }: BarbershopSetupProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
    email: '',
    image_url: '',
    amenities: [] as string[],
    latitude: null as number | null,
    longitude: null as number | null,
  });
  
  const [geocodeStatus, setGeocodeStatus] = useState<'idle' | 'searching' | 'found' | 'error'>('idle');
  const { geocode, loading: geocodeLoading, error: geocodeError, clearError } = useGeocode();
  
  // Debounce the full address for geocoding
  const fullAddress = `${formData.address}, ${formData.city}, ${formData.state}, ${formData.postal_code}`;
  const debouncedAddress = useDebounce(fullAddress, 1000);

  // Auto-geocode when address changes
  useEffect(() => {
    const shouldGeocode = formData.address.length >= 5 && 
                          formData.city.length >= 2 && 
                          formData.state.length === 2;

    if (shouldGeocode) {
      handleGeocode();
    }
  }, [debouncedAddress]);

  const handleGeocode = useCallback(async () => {
    if (formData.address.length < 5 || formData.city.length < 2) return;
    
    clearError();
    setGeocodeStatus('searching');
    
    const searchAddress = `${formData.address}, ${formData.city}, ${formData.state}, Brasil`;
    const result = await geocode(searchAddress);
    
    if (result) {
      setFormData(prev => ({
        ...prev,
        latitude: result.latitude,
        longitude: result.longitude,
        // Auto-fill city/state if empty
        city: prev.city || result.city,
        state: prev.state || result.state,
      }));
      setGeocodeStatus('found');
    } else {
      setGeocodeStatus('error');
    }
  }, [formData.address, formData.city, formData.state, geocode, clearError]);

  const amenitiesList = [
    'Wi-Fi Grátis',
    'Ar Condicionado',
    'TV',
    'Música',
    'Estacionamento',
    'Acessibilidade',
    'Pagamento Cartão',
    'PIX',
    'Produtos para Venda'
  ];

  const handleAmenityChange = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate coordinates
    if (!formData.latitude || !formData.longitude) {
      toast({
        title: 'Localização necessária',
        description: 'Por favor, preencha o endereço completo para obter as coordenadas automaticamente.',
        variant: 'destructive'
      });
      return;
    }

    // Sanitizar dados
    const sanitizedData = {
      name: sanitizeString(formData.name),
      description: sanitizeString(formData.description),
      address: sanitizeString(formData.address),
      phone: sanitizeString(formData.phone),
      email: formData.email.trim().toLowerCase(),
      image_url: formData.image_url || null,
      amenities: formData.amenities.map(a => sanitizeString(a)),
    };

    // Validação com Zod
    const validation = validateWithSchema(barbershopCreateSchema, sanitizedData);
    if (!validation.success) {
      toast({
        title: 'Erro de validação',
        description: formatValidationErrors(validation.errors),
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('barbershops')
        .insert([{
          owner_id: user.id,
          name: validation.data.name,
          description: validation.data.description,
          address: validation.data.address,
          city: sanitizeString(formData.city),
          state: formData.state.toUpperCase(),
          latitude: formData.latitude,
          longitude: formData.longitude,
          phone: validation.data.phone,
          email: validation.data.email,
          image_url: validation.data.image_url,
          amenities: validation.data.amenities,
          opening_hours: {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '18:00' },
            saturday: { open: '09:00', close: '16:00' },
            sunday: { open: 'Fechado', close: 'Fechado' }
          }
        }]);

      if (error) throw error;

      toast({
        title: "Barbearia criada!",
        description: "Sua barbearia foi configurada com sucesso."
      });

      onBarbershopCreated();
    } catch (error: any) {
      toast({
        title: "Erro ao criar barbearia",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          Configure sua Barbearia
        </CardTitle>
        <CardDescription>
          Complete os dados da sua barbearia para começar a receber agendamentos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Barbearia *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          {/* Address Section */}
          <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <MapPin className="h-4 w-4" />
              Endereço (será usado para busca por proximidade)
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Endereço (Rua, Número, Bairro) *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, address: e.target.value, latitude: null, longitude: null }));
                  setGeocodeStatus('idle');
                }}
                placeholder="Rua das Flores, 123, Centro"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, city: e.target.value, latitude: null, longitude: null }));
                    setGeocodeStatus('idle');
                  }}
                  placeholder="São Paulo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado (UF) *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().slice(0, 2);
                    setFormData(prev => ({ ...prev, state: value, latitude: null, longitude: null }));
                    setGeocodeStatus('idle');
                  }}
                  placeholder="SP"
                  maxLength={2}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">CEP</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, postal_code: formatCEP(e.target.value) }));
                  }}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>
            </div>

            {/* Geocode Status */}
            {geocodeLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando coordenadas...
              </div>
            )}

            {geocodeStatus === 'found' && formData.latitude && formData.longitude && (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  Localização encontrada! Lat: {formData.latitude.toFixed(6)}, Lng: {formData.longitude.toFixed(6)}
                </AlertDescription>
              </Alert>
            )}

            {geocodeStatus === 'error' && geocodeError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {geocodeError}
                  <Button 
                    type="button" 
                    variant="link" 
                    className="p-0 h-auto ml-2"
                    onClick={handleGeocode}
                  >
                    Tentar novamente
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            {!geocodeLoading && geocodeStatus === 'idle' && formData.address.length >= 5 && formData.city.length >= 2 && (
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={handleGeocode}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Buscar coordenadas
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva sua barbearia, especialidades, diferenciais..."
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Label>Comodidades</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {amenitiesList.map((amenity) => (
                <div key={amenity} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={amenity}
                    checked={formData.amenities.includes(amenity)}
                    onChange={() => handleAmenityChange(amenity)}
                    className="rounded border-border"
                  />
                  <Label htmlFor={amenity} className="text-sm cursor-pointer">
                    {amenity}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imagem da Barbearia</Label>
            <ImageUpload
              currentImageUrl={formData.image_url}
              onImageUploaded={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
              bucket="barbershop-images"
              folder="main"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !formData.latitude || !formData.longitude}>
            {loading ? 'Criando...' : 'Criar Barbearia'}
          </Button>
          
          {(!formData.latitude || !formData.longitude) && (
            <p className="text-sm text-muted-foreground text-center">
              Preencha o endereço completo para habilitar o botão de criar.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default BarbershopSetup;
