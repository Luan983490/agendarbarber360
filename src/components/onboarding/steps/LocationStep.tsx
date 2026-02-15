import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LocationStepProps {
  barbershopId: string;
  onComplete: () => void;
  initialData?: Record<string, string>;
}

export function LocationStep({ barbershopId, onComplete, initialData }: LocationStepProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [country, setCountry] = useState(initialData?.country || 'Brasil');
  const [postalCode, setPostalCode] = useState(initialData?.postal_code || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [state, setState] = useState(initialData?.state || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [neighborhood, setNeighborhood] = useState(initialData?.neighborhood || '');
  const [streetNumber, setStreetNumber] = useState(initialData?.street_number || '');

  // Load existing barbershop data
  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase
        .from('barbershops')
        .select('country, postal_code, address, state, city, neighborhood, street_number')
        .eq('id', barbershopId)
        .single();
      if (data) {
        if (data.country) setCountry(data.country);
        if (data.postal_code) setPostalCode(data.postal_code);
        if (data.address) setAddress(data.address);
        if (data.state) setState(data.state);
        if (data.city) setCity(data.city);
        if (data.neighborhood) setNeighborhood(data.neighborhood);
        if (data.street_number) setStreetNumber(data.street_number);
      }
    };
    loadData();
  }, [barbershopId]);

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return digits;
  };

  const handleCepChange = async (value: string) => {
    const formatted = formatCep(value);
    setPostalCode(formatted);
    const digits = formatted.replace(/\D/g, '');

    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAddress(data.logradouro || '');
          setState(data.uf || '');
          setCity(data.localidade || '');
          setNeighborhood(data.bairro || '');
        } else {
          toast({ title: 'CEP não encontrado', variant: 'destructive' });
        }
      } catch {
        toast({ title: 'Erro ao buscar CEP', variant: 'destructive' });
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!postalCode || !address || !state || !city || !neighborhood || !streetNumber) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({
          country,
          postal_code: postalCode.replace(/\D/g, ''),
          address,
          state,
          city,
          neighborhood,
          street_number: streetNumber,
        })
        .eq('id', barbershopId);

      if (error) throw error;
      onComplete();
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex-1 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Localização do Estabelecimento</h2>
          <p className="text-sm text-slate-400 mt-1">Informe o endereço da sua barbearia</p>
        </div>

        <div className="space-y-5">
          <div>
            <Label className="text-slate-300">País <span className="text-red-400">*</span></Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="mt-1.5 bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Brasil">🇧🇷 Brasil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">CEP/Código Postal <span className="text-red-400">*</span></Label>
              <div className="relative mt-1.5">
                <Input
                  value={postalCode}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
                {cepLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-slate-400" />}
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Endereço <span className="text-red-400">*</span></Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1.5 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Estado <span className="text-red-400">*</span></Label>
              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Informe o Estado"
                className="mt-1.5 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <div>
              <Label className="text-slate-300">Cidade <span className="text-red-400">*</span></Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Informe a Cidade"
                className="mt-1.5 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Bairro <span className="text-red-400">*</span></Label>
              <Input
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="mt-1.5 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <div>
              <Label className="text-slate-300">Número do Endereço <span className="text-red-400">*</span></Label>
              <Input
                value={streetNumber}
                onChange={(e) => setStreetNumber(e.target.value)}
                className="mt-1.5 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-slate-700/50 mt-6">
        <Button onClick={handleSubmit} disabled={loading} className="px-8">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Continuar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
