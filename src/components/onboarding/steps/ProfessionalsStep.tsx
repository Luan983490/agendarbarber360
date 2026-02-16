import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Plus, Trash2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Barber {
  id: string;
  name: string;
  specialty: string | null;
  phone: string | null;
}

interface ProfessionalsStepProps {
  barbershopId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function ProfessionalsStep({ barbershopId, onComplete, onBack }: ProfessionalsStepProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [barbers, setBarbers] = useState<Barber[]>([]);

  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');

  const fetchBarbers = async () => {
    const { data } = await supabase
      .from('barbers')
      .select('id, name, specialty, phone')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    setBarbers(data || []);
  };

  useEffect(() => {
    fetchBarbers();
  }, [barbershopId]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length > 6) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length > 2) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length > 0) return `(${digits}`;
    return '';
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      toast({ title: 'Informe o nome do profissional', variant: 'destructive' });
      return;
    }

    setAddLoading(true);
    try {
      const { data: newBarber, error } = await supabase.from('barbers').insert({
        barbershop_id: barbershopId,
        name: name.trim(),
        specialty: specialty.trim() || null,
        phone: phone.replace(/\D/g, '') || null,
        is_active: true,
      }).select('id').single();
      if (error) throw error;

      // Create default working hours (Mon-Sat: 09:00-11:00, 13:00-18:00; Sun: day off)
      const defaultHours = Array.from({ length: 7 }, (_, i) => ({
        barber_id: newBarber.id,
        day_of_week: i,
        is_day_off: i === 0, // Sunday off
        period1_start: i === 0 ? null : '09:00',
        period1_end: i === 0 ? null : '11:00',
        period2_start: i === 0 ? null : '13:00',
        period2_end: i === 0 ? null : '18:00',
      }));
      await supabase.from('barber_working_hours').insert(defaultHours);
      setName('');
      setSpecialty('');
      setPhone('');
      await fetchBarbers();
      toast({ title: 'Profissional adicionado!' });
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar', description: error.message, variant: 'destructive' });
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('barbers')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', id);
      if (error) throw error;
      await fetchBarbers();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  const handleFinish = async () => {
    if (barbers.length === 0) {
      toast({ title: 'Cadastre pelo menos 1 profissional para finalizar', variant: 'destructive' });
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
          <h2 className="text-xl font-semibold text-white">Profissionais</h2>
          <p className="text-sm text-slate-400 mt-1">Cadastre os profissionais da sua barbearia</p>
        </div>

        {/* Add form */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_150px_auto] gap-3 items-end">
          <div>
            <Label className="text-slate-300">Nome <span className="text-red-400">*</span></Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo do profissional"
              className="mt-1.5 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div>
            <Label className="text-slate-300">Especialidade</Label>
            <Input
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Ex: Barbeiro, Recepcionista"
              className="mt-1.5 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div>
            <Label className="text-slate-300">Telefone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              className="mt-1.5 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={addLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {addLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Adicionar</>}
          </Button>
        </div>

        {/* Barbers list */}
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Profissionais Cadastrados</h3>
          {barbers.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">Nenhum profissional cadastrado. Adicione pelo menos um para finalizar.</p>
          ) : (
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50 text-slate-400 text-xs uppercase">
                    <th className="text-left py-2.5 px-4">Nome</th>
                    <th className="text-left py-2.5 px-4">Especialidade</th>
                    <th className="text-left py-2.5 px-4">Telefone</th>
                    <th className="text-right py-2.5 px-4">Excluir</th>
                  </tr>
                </thead>
                <tbody>
                  {barbers.map((b) => (
                    <tr key={b.id} className="border-t border-slate-700">
                      <td className="py-3 px-4 text-white text-sm">{b.name}</td>
                      <td className="py-3 px-4 text-slate-300 text-sm">{b.specialty || '-'}</td>
                      <td className="py-3 px-4 text-slate-300 text-sm">{b.phone ? formatPhone(b.phone) : '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleDelete(b.id)} className="text-slate-400 hover:text-red-400 transition-colors">
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
        <Button onClick={handleFinish} disabled={loading} className="px-8">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
          Finalizar
        </Button>
      </div>
    </>
  );
}
