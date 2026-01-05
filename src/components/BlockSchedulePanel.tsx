import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ban, Unlock, Clock, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BlockSchedulePanelProps {
  barbershopId: string;
  selectedBarberId?: string;
  onBlockSuccess?: () => void;
}

const WORK_HOURS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
];

type ActionMode = 'block' | 'unblock';

export const BlockSchedulePanel = ({ barbershopId, selectedBarberId, onBlockSuccess }: BlockSchedulePanelProps) => {
  const [barbers, setBarbers] = useState<{ id: string; name: string }[]>([]);
  const [barberId, setBarberId] = useState(selectedBarberId || '');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [blockMode, setBlockMode] = useState<'full-day' | 'specific-times'>('full-day');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('20:00');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActionMode>('block');
  const { toast } = useToast();

  useEffect(() => {
    fetchBarbers();
  }, [barbershopId]);

  useEffect(() => {
    if (selectedBarberId) {
      setBarberId(selectedBarberId);
    }
  }, [selectedBarberId]);

  const fetchBarbers = async () => {
    const { data } = await supabase
      .from('barbers')
      .select('id, name')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);
    
    setBarbers(data || []);
    if (data && data.length > 0 && !barberId) {
      setBarberId(data[0].id);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const isSelected = selectedDates.some(d => format(d, 'yyyy-MM-dd') === dateStr);
    
    if (isSelected) {
      setSelectedDates(selectedDates.filter(d => format(d, 'yyyy-MM-dd') !== dateStr));
    } else {
      setSelectedDates([...selectedDates, date]);
    }
  };

  const removeDate = (dateToRemove: Date) => {
    const dateStr = format(dateToRemove, 'yyyy-MM-dd');
    setSelectedDates(selectedDates.filter(d => format(d, 'yyyy-MM-dd') !== dateStr));
  };

  const handleBlock = async () => {
    if (!barberId) {
      toast({
        title: 'Erro',
        description: 'Selecione um profissional',
        variant: 'destructive'
      });
      return;
    }

    if (selectedDates.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos uma data',
        variant: 'destructive'
      });
      return;
    }

    if (blockMode === 'specific-times' && startTime >= endTime) {
      toast({
        title: 'Erro',
        description: 'O horário de início deve ser menor que o horário de fim',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const blocksToInsert: any[] = [];

      for (const date of selectedDates) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOfWeek = date.getDay();
        
        if (blockMode === 'full-day') {
          // Fetch actual working hours for this barber and day
          const { data: workingHours } = await supabase
            .from('barber_working_hours')
            .select('*')
            .eq('barber_id', barberId)
            .eq('day_of_week', dayOfWeek)
            .single();

          // Check for schedule overrides
          const { data: overrides } = await supabase
            .from('barber_schedule_overrides')
            .select('*')
            .eq('barber_id', barberId)
            .eq('day_of_week', dayOfWeek)
            .lte('start_date', dateStr)
            .gte('end_date', dateStr)
            .limit(1);

          const schedule = overrides?.[0] || workingHours;

          if (!schedule || schedule.is_day_off) {
            // Skip days off - no need to block
            continue;
          }

          // Find the earliest start and latest end from all periods
          const times: string[] = [];
          if (schedule.period1_start) times.push(schedule.period1_start.substring(0, 5));
          if (schedule.period1_end) times.push(schedule.period1_end.substring(0, 5));
          if (schedule.period2_start) times.push(schedule.period2_start.substring(0, 5));
          if (schedule.period2_end) times.push(schedule.period2_end.substring(0, 5));

          if (times.length >= 2) {
            times.sort();
            const earliestTime = times[0];
            const latestTime = times[times.length - 1];

            // Create a single block covering the entire working day
            blocksToInsert.push({
              barber_id: barberId,
              block_date: dateStr,
              start_time: earliestTime,
              end_time: latestTime,
              reason: reason || null
            });
          }
        } else {
          // Bloquear apenas o intervalo selecionado
          blocksToInsert.push({
            barber_id: barberId,
            block_date: dateStr,
            start_time: startTime,
            end_time: endTime,
            reason: reason || null
          });
        }
      }

      if (blocksToInsert.length === 0) {
        toast({
          title: 'Nenhum horário para bloquear',
          description: 'Os dias selecionados são folga ou não têm horários configurados',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('barber_blocks')
        .insert(blocksToInsert);

      if (error) throw error;

      const daysText = blocksToInsert.length === 1 ? 'dia' : 'dias';
      toast({
        title: 'Bloqueio criado',
        description: `${blocksToInsert.length} ${daysText} bloqueado(s) com sucesso`
      });

      // Reset form
      setSelectedDates([]);
      setReason('');
      setBlockMode('full-day');
      setStartTime('08:00');
      setEndTime('20:00');

      onBlockSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Erro ao bloquear',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!barberId) {
      toast({
        title: 'Erro',
        description: 'Selecione um profissional',
        variant: 'destructive'
      });
      return;
    }

    if (selectedDates.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos uma data',
        variant: 'destructive'
      });
      return;
    }

    if (blockMode === 'specific-times' && startTime >= endTime) {
      toast({
        title: 'Erro',
        description: 'O horário de início deve ser menor que o horário de fim',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      let totalDeleted = 0;

      for (const date of selectedDates) {
        const dateStr = format(date, 'yyyy-MM-dd');

        if (blockMode === 'full-day') {
          // Delete all blocks for this date
          const { data, error } = await supabase
            .from('barber_blocks')
            .delete()
            .eq('barber_id', barberId)
            .eq('block_date', dateStr)
            .select();

          if (error) throw error;
          totalDeleted += data?.length || 0;
        } else {
          // Delete blocks that overlap with the selected time range
          const { data: existingBlocks, error: fetchError } = await supabase
            .from('barber_blocks')
            .select('*')
            .eq('barber_id', barberId)
            .eq('block_date', dateStr);

          if (fetchError) throw fetchError;

          // Find blocks that overlap with the selected range
          const blocksToDelete = (existingBlocks || []).filter(block => {
            // Check if block overlaps with selected range
            return block.start_time < endTime && block.end_time > startTime;
          });

          if (blocksToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('barber_blocks')
              .delete()
              .in('id', blocksToDelete.map(b => b.id));

            if (deleteError) throw deleteError;
            totalDeleted += blocksToDelete.length;
          }
        }
      }

      if (totalDeleted === 0) {
        toast({
          title: 'Nenhum bloqueio encontrado',
          description: 'Não há bloqueios para remover nos dias/horários selecionados',
          variant: 'default'
        });
      } else {
        toast({
          title: 'Desbloqueio realizado',
          description: `${totalDeleted} bloqueio(s) removido(s) com sucesso`
        });
      }

      // Reset form
      setSelectedDates([]);
      setBlockMode('full-day');
      setStartTime('08:00');
      setEndTime('20:00');

      onBlockSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Erro ao desbloquear',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as ActionMode);
    // Reset selections when changing tabs
    setSelectedDates([]);
    setBlockMode('full-day');
    setStartTime('08:00');
    setEndTime('20:00');
    setReason('');
  };

  const modifiers = {
    selected: selectedDates
  };

  const modifiersStyles = {
    selected: {
      backgroundColor: activeTab === 'block' 
        ? 'hsl(var(--destructive))' 
        : 'hsl(var(--primary))',
      color: activeTab === 'block'
        ? 'hsl(var(--destructive-foreground))'
        : 'hsl(var(--primary-foreground))'
    }
  };

  const renderForm = () => (
    <>
      {/* Seletor de Profissional */}
      <div className="space-y-2">
        <Label className="text-sm">Profissional</Label>
        <Select value={barberId} onValueChange={setBarberId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um profissional" />
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

      {/* Calendário */}
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={undefined}
          onSelect={handleDateSelect}
          locale={ptBR}
          className="rounded-md border pointer-events-auto"
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
        />
      </div>

      {/* Dias Selecionados */}
      {selectedDates.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm">Dias selecionados ({selectedDates.length})</Label>
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
            {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map((date) => (
              <Badge 
                key={format(date, 'yyyy-MM-dd')}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {format(date, 'dd/MM', { locale: ptBR })}
                <button
                  onClick={() => removeDate(date)}
                  className="hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tipo de Bloqueio/Desbloqueio */}
      <div className="space-y-2">
        <Label className="text-sm flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {activeTab === 'block' ? 'Tipo de Bloqueio' : 'Tipo de Desbloqueio'}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={blockMode === 'full-day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBlockMode('full-day')}
          >
            Dia Inteiro
          </Button>
          <Button
            type="button"
            variant={blockMode === 'specific-times' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBlockMode('specific-times')}
          >
            Horário Específico
          </Button>
        </div>
      </div>

      {/* Horários (se modo específico) */}
      {blockMode === 'specific-times' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Início</Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {WORK_HOURS.slice(0, -1).map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fim</Label>
            <Select value={endTime} onValueChange={setEndTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {WORK_HOURS.slice(1).map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Motivo (apenas para bloqueio) */}
      {activeTab === 'block' && (
        <div className="space-y-1">
          <Label className="text-sm">Motivo (opcional)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Férias, folga, compromisso pessoal..."
            rows={2}
            className="resize-none"
          />
        </div>
      )}

      {/* Botão de Ação */}
      {activeTab === 'block' ? (
        <Button
          onClick={handleBlock}
          disabled={loading || selectedDates.length === 0 || !barberId}
          className="w-full bg-destructive hover:bg-destructive/90"
        >
          <Ban className="mr-2 h-4 w-4" />
          {loading ? 'Bloqueando...' : `Bloquear${selectedDates.length > 0 ? ` (${selectedDates.length})` : ''}`}
        </Button>
      ) : (
        <Button
          onClick={handleUnblock}
          disabled={loading || selectedDates.length === 0 || !barberId}
          className="w-full"
        >
          <Unlock className="mr-2 h-4 w-4" />
          {loading ? 'Desbloqueando...' : `Desbloquear${selectedDates.length > 0 ? ` (${selectedDates.length})` : ''}`}
        </Button>
      )}
    </>
  );

  return (
    <Card className="flex flex-col h-full max-h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {activeTab === 'block' ? <Ban className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          Gerenciar Horários
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-3 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="block">
              <Ban className="h-4 w-4 mr-1" />
              Bloquear
            </TabsTrigger>
            <TabsTrigger value="unblock">
              <Unlock className="h-4 w-4 mr-1" />
              Desbloquear
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {renderForm()}
      </CardContent>
    </Card>
  );
};
