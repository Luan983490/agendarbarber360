import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowRight, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface ServicesStepProps {
  barbershopId: string;
  onComplete: () => void;
  onBack: () => void;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export function ServicesStep({ barbershopId, onComplete, onBack }: ServicesStepProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name, price, duration')
      .eq('barbershop_id', barbershopId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    setServices(data || []);
  };

  useEffect(() => {
    fetchServices();
  }, [barbershopId]);

  const handleAdd = async () => {
    if (!name.trim()) {
      toast({ title: 'Informe a descrição do serviço', variant: 'destructive' });
      return;
    }
    const priceValue = parseFloat(price.replace(',', '.'));
    if (!price || isNaN(priceValue) || priceValue <= 0) {
      toast({ title: 'Informe um valor válido', variant: 'destructive' });
      return;
    }
    if (!duration) {
      toast({ title: 'Selecione a duração', variant: 'destructive' });
      return;
    }

    setAddLoading(true);
    try {
      const { error } = await supabase.from('services').insert({
        barbershop_id: barbershopId,
        name: name.trim(),
        price: priceValue,
        duration: parseInt(duration),
      });
      if (error) throw error;
      setName('');
      setPrice('');
      setDuration('');
      await fetchServices();
      toast({ title: 'Serviço adicionado!' });
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' });
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await fetchServices();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  const handleContinue = async () => {
    if (services.length === 0) {
      toast({ title: 'Cadastre pelo menos 1 serviço para continuar', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex-1 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Serviços</h2>
          <p className="text-sm text-slate-400 mt-1">Cadastre os serviços oferecidos pela sua barbearia</p>
        </div>

        {/* Add form */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px_auto] gap-3 items-end">
          <div>
            <Label className="text-slate-300">Descrição <span className="text-red-400">*</span></Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Corte, Barba"
              className="mt-1.5 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div>
            <Label className="text-slate-300">Valor</Label>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9,]/g, ''))}
              placeholder="45,00"
              className="mt-1.5 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div>
            <Label className="text-slate-300">Duração</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="mt-1.5 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Duração" />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} Minutos</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAdd}
            disabled={addLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Adicionar</>}
          </Button>
        </div>

        {/* Services list */}
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Serviços Cadastrados</h3>
          {services.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">Nenhum serviço cadastrado ainda. Adicione pelo menos um serviço para continuar.</p>
          ) : (
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50 text-slate-400 text-xs uppercase">
                    <th className="text-left py-2.5 px-4">Descrição</th>
                    <th className="text-left py-2.5 px-4">Valor</th>
                    <th className="text-left py-2.5 px-4">Duração</th>
                    <th className="text-right py-2.5 px-4">Excluir</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id} className="border-t border-slate-700">
                      <td className="py-3 px-4 text-white text-sm">{s.name}</td>
                      <td className="py-3 px-4 text-white text-sm">{Number(s.price).toFixed(2).replace('.', ',')}</td>
                      <td className="py-3 px-4 text-white text-sm">{s.duration} Minutos</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleDelete(s.id)} className="text-slate-400 hover:text-red-400 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t border-slate-700/50 mt-6">
        <Button variant="ghost" onClick={onBack} className="text-slate-300 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <Button onClick={handleContinue} disabled={loading} className="px-8">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Continuar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
