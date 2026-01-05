import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Store } from 'lucide-react';
import ImageUpload from './ImageUpload';
import { barbershopCreateSchema, validateWithSchema, formatValidationErrors, sanitizeString } from '@/lib/validation-schemas';

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
    phone: '',
    email: '',
    image_url: '',
    amenities: [] as string[]
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

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
              <Label htmlFor="name">Nome da Barbearia</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço Completo</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Rua, número, bairro, cidade - CEP"
              required
            />
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

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Criando...' : 'Criar Barbearia'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default BarbershopSetup;