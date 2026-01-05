import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Ban, Calendar as CalendarIcon, Clock, X, Info } from 'lucide-react';
import { format, addDays } from 'date-fns';
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

export const BlockSchedulePanel = ({ barbershopId, selectedBarberId, onBlockSuccess }: BlockSchedulePanelProps) => {
  const [barbers, setBarbers] = useState<{ id: string; name: string }[]>([]);
  const [barberId, setBarberId] = useState(selectedBarberId || '');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [blockMode, setBlockMode] = useState<'full-day' | 'specific-times'>('full-day');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('20:00');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
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

  const modifiers = {
    selected: selectedDates
  };

  const modifiersStyles = {
    selected: {
      backgroundColor: 'hsl(var(--destructive))',
      color: 'hsl(var(--destructive-foreground))'
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 p-3 sm:p-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Ban className="h-4 w-4" />
          Bloquear Horários
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-3 overflow-y-auto p-3 sm:p-4 pt-0">
        {/* Seletor de Profissional */}
        <div className="space-y-1.5">
          <Label className="text-xs">Profissional</Label>
          <Select value={barberId} onValueChange={setBarberId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Selecione" />
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
          <div className="space-y-1.5">
            <Label className="text-xs">Selecionados ({selectedDates.length})</Label>
            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
              {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map((date) => (
                <Badge 
                  key={format(date, 'yyyy-MM-dd')}
                  variant="secondary"
                  className="flex items-center gap-1 text-xs"
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

        {/* Tipo de Bloqueio */}
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Tipo de Bloqueio
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={blockMode === 'full-day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBlockMode('full-day')}
              className="text-xs h-8"
            >
              Dia Inteiro
            </Button>
            <Button
              type="button"
              variant={blockMode === 'specific-times' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBlockMode('specific-times')}
              className="text-xs h-8"
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
                <SelectTrigger className="h-9 text-sm">
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
                <SelectTrigger className="h-9 text-sm">
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

        {/* Motivo */}
        <div className="space-y-1">
          <Label className="text-xs">Motivo (opcional)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Férias, folga, evento..."
            rows={2}
            className="text-sm resize-none"
          />
        </div>

        {/* Botão de Bloquear */}
        <Button
          onClick={handleBlock}
          disabled={loading || selectedDates.length === 0 || !barberId}
          className="w-full bg-destructive hover:bg-destructive/90 text-sm h-9"
        >
          <Ban className="mr-2 h-4 w-4" />
          {loading ? 'Bloqueando...' : `Bloquear${selectedDates.length > 0 ? ` (${selectedDates.length})` : ''}`}
        </Button>
      </CardContent>
    </Card>
  );
};
