import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SegmentationStepProps {
  barbershopId: string;
  onComplete: () => void;
  onBack: () => void;
}

const PROFESSIONAL_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2-5', label: '2 a 5' },
  { value: '6-15', label: '6 a 15' },
  { value: '15+', label: '+ 15' },
];

const DISCOVERY_OPTIONS = [
  'Indicação de amigo',
  'Redes sociais',
  'Google',
  'Instagram',
  'Facebook',
  'Outro',
];

export function SegmentationStep({ barbershopId, onComplete, onBack }: SegmentationStepProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [haircutPrice, setHaircutPrice] = useState('');
  const [discoverySource, setDiscoverySource] = useState('');
  const [professionalCount, setProfessionalCount] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase
        .from('barbershops')
        .select('haircut_price, discovery_source, professional_count_range')
        .eq('id', barbershopId)
        .single();
      if (data) {
        if (data.haircut_price) setHaircutPrice(String(data.haircut_price).replace('.', ','));
        if (data.discovery_source) setDiscoverySource(data.discovery_source);
        if (data.professional_count_range) setProfessionalCount(data.professional_count_range);
      }
    };
    loadData();
  }, [barbershopId]);

  const handleSubmit = async () => {
    const priceValue = parseFloat(haircutPrice.replace(',', '.'));
    if (!haircutPrice || isNaN(priceValue) || priceValue <= 0) {
      toast({ title: 'Informe um valor válido para o corte', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({
          haircut_price: priceValue,
          discovery_source: discoverySource || null,
          professional_count_range: professionalCount || null,
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
          <h2 className="text-xl font-semibold text-white">Segmentação do Estabelecimento</h2>
          <p className="text-sm text-slate-400 mt-1">Nos conte mais sobre sua barbearia</p>
        </div>

        <div className="space-y-5">
          <div>
            <Label className="text-slate-300">Valor do Corte</Label>
            <Input
              value={haircutPrice}
              onChange={(e) => setHaircutPrice(e.target.value.replace(/[^0-9,]/g, ''))}
              placeholder="50,00"
              className="mt-1.5 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>

          <div>
            <Label className="text-slate-300">Como Soube</Label>
            <Select value={discoverySource} onValueChange={setDiscoverySource}>
              <SelectTrigger className="mt-1.5 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Nos informe como nos encontrou" />
              </SelectTrigger>
              <SelectContent>
                {DISCOVERY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">Número de Profissionais</Label>
            <p className="text-xs text-slate-500 mt-0.5">Incluindo gestores e recepcionistas (Se houver)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              {PROFESSIONAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProfessionalCount(opt.value)}
                  className={cn(
                    'py-4 rounded-lg border-2 text-center font-medium transition-all',
                    professionalCount === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-600 text-slate-300 hover:border-slate-500 bg-slate-700/50'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t border-slate-700/50 mt-6">
        <Button variant="ghost" onClick={onBack} className="text-slate-300 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button onClick={handleSubmit} disabled={loading} className="px-8">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Continuar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
