import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface BarberBlock {
  id: string;
  barber_id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  barber?: { name: string };
}

interface Barber {
  id: string;
  name: string;
}

interface BarberBlocksManagementProps {
  barbershopId: string;
}

export const BarberBlocksManagement = ({ barbershopId }: BarberBlocksManagementProps) => {
  const [blocks, setBlocks] = useState<BarberBlock[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>('');
  const [blockDate, setBlockDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBarbers();
    fetchBlocks();

    const channel = supabase
      .channel('barber-blocks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'barber_blocks'
        },
        () => {
          fetchBlocks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barbershopId]);

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true);

      if (error) throw error;
      setBarbers(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar barbeiros:', error);
    }
  };

  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const { data: barbersData } = await supabase
        .from('barbers')
        .select('id')
        .eq('barbershop_id', barbershopId);

      if (!barbersData) return;

      const barberIds = barbersData.map(b => b.id);
      const { data: blocksData, error } = await supabase
        .from('barber_blocks')
        .select('id, barber_id, block_date, start_time, end_time, reason')
        .in('barber_id', barberIds)
        .gte('block_date', new Date().toISOString().split('T')[0])
        .order('block_date', { ascending: true });

      if (error) throw error;

      const barbersMap = new Map<string, { id: string; name: string }>();
      barbers.forEach(b => barbersMap.set(b.id, b));

      const mappedBlocks: BarberBlock[] = blocksData?.map(block => ({
        ...block,
        barber: barbersMap.get(block.barber_id)
      })) || [];

      setBlocks(mappedBlocks);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar bloqueios',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlock = async () => {
    if (!selectedBarber || !blockDate || !startTime || !endTime) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha barbeiro, data e horários',
        variant: 'destructive'
      });
      return;
    }

    if (startTime >= endTime) {
      toast({
        title: 'Horário inválido',
        description: 'O horário de início deve ser antes do horário de fim',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('barber_blocks')
        .insert({
          barber_id: selectedBarber,
          block_date: blockDate,
          start_time: startTime,
          end_time: endTime,
          reason: reason || null
        });

      if (error) throw error;

      toast({
        title: 'Bloqueio criado',
        description: 'Horário bloqueado com sucesso'
      });

      setSelectedBarber('');
      setBlockDate('');
      setStartTime('');
      setEndTime('');
      setReason('');
      fetchBlocks();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar bloqueio',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from('barber_blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      toast({
        title: 'Bloqueio removido',
        description: 'O horário foi desbloqueado'
      });

      fetchBlocks();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover bloqueio',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Bloquear Horários
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Barbeiro</Label>
              <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={blockDate}
                onChange={(e) => setBlockDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label>Horário Início</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Horário Fim</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Motivo (opcional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Consulta médica, almoço, etc."
              rows={2}
            />
          </div>

          <Button onClick={handleAddBlock} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Bloquear Horário
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horários Bloqueados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground">Carregando...</p>
          ) : blocks.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhum horário bloqueado</p>
          ) : (
            <div className="space-y-3">
              {blocks.map((block) => (
                <Card key={block.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold">{block.barber?.name || 'Barbeiro'}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(block.block_date + 'T00:00:00'), 'dd/MM/yyyy')}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {block.start_time} - {block.end_time}
                        </div>
                        {block.reason && (
                          <p className="text-sm text-muted-foreground">
                            Motivo: {block.reason}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteBlock(block.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
