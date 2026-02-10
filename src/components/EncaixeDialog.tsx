import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, User, AlertTriangle, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { sanitizeString } from '@/lib/sanitizer';
import { getErrorMessage } from '@/lib/error-handler';
import { CreateClientDialog } from './CreateClientDialog';

interface ServiceOption {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface ClientOption {
  user_id: string;
  display_name: string | null;
  phone: string | null;
}

interface GapSlot {
  start: string; // HH:MM
  end: string;   // HH:MM
  durationMinutes: number;
}

interface Booking {
  booking_date: string;
  booking_time: string;
  service_duration?: number;
  status: string;
}

interface Block {
  block_date: string;
  start_time: string;
  end_time: string;
}

interface WorkingHour {
  day_of_week: number;
  period1_start: string | null;
  period1_end: string | null;
  period2_start: string | null;
  period2_end: string | null;
  is_day_off: boolean;
}

interface EncaixeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barberId: string;
  barbershopId: string;
  currentDate: Date;
  bookings: Booking[];
  blocks: Block[];
  workingHours: WorkingHour[];
  overrides: WorkingHour[];
  onSuccess: () => void;
}

const timeToMinutes = (time: string) => {
  const [h, m] = time.substring(0, 5).split(':').map(Number);
  return h * 60 + m;
};

const minutesToHHMM = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const EncaixeDialog = ({
  open,
  onOpenChange,
  barberId,
  barbershopId,
  currentDate,
  bookings,
  blocks,
  workingHours,
  overrides,
  onSuccess,
}: EncaixeDialogProps) => {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedService, setSelectedService] = useState('');
  const [selectedGap, setSelectedGap] = useState<GapSlot | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [isExternalBooking, setIsExternalBooking] = useState(true);
  const [externalClientName, setExternalClientName] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchServices();
      fetchClients();
      setSelectedService('');
      setSelectedGap(null);
      setSelectedTime('');
      setExternalClientName('');
      setSelectedClient('');
      setNotes('');
      setIsExternalBooking(true);
    }
  }, [open, barbershopId]);

  const fetchServices = async () => {
    const { data } = await supabase
      .from('services')
      .select('id, name, price, duration')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true);
    setServices(data || []);
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, phone')
      .eq('user_type', 'client')
      .limit(50);
    setClients(data || []);
  };

  // Calculate available gaps for the current date
  const gaps = useMemo(() => {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const dayOfWeek = currentDate.getDay();

    // Get working hours for this day
    const override = overrides.find(o =>
      o.day_of_week === dayOfWeek &&
      dateStr >= (o as any).start_date &&
      dateStr <= (o as any).end_date
    );
    const schedule = override || workingHours.find(h => h.day_of_week === dayOfWeek);

    if (!schedule || schedule.is_day_off) return [];

    // Collect working periods
    const periods: Array<{ start: number; end: number }> = [];
    if (schedule.period1_start && schedule.period1_end) {
      periods.push({
        start: timeToMinutes(schedule.period1_start),
        end: timeToMinutes(schedule.period1_end),
      });
    }
    if (schedule.period2_start && schedule.period2_end) {
      periods.push({
        start: timeToMinutes(schedule.period2_start),
        end: timeToMinutes(schedule.period2_end),
      });
    }

    if (periods.length === 0) return [];

    // Collect all "occupied" intervals (bookings + blocks) for this date
    const occupied: Array<{ start: number; end: number }> = [];

    bookings
      .filter(b => b.booking_date === dateStr && b.status !== 'cancelled')
      .forEach(b => {
        const start = timeToMinutes(b.booking_time);
        const duration = b.service_duration || 30;
        occupied.push({ start, end: start + duration });
      });

    blocks
      .filter(b => b.block_date === dateStr)
      .forEach(b => {
        occupied.push({
          start: timeToMinutes(b.start_time),
          end: timeToMinutes(b.end_time),
        });
      });

    // Sort occupied by start
    occupied.sort((a, b) => a.start - b.start);

    // Merge overlapping occupied intervals
    const merged: Array<{ start: number; end: number }> = [];
    for (const interval of occupied) {
      if (merged.length === 0 || interval.start >= merged[merged.length - 1].end) {
        merged.push({ ...interval });
      } else {
        merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, interval.end);
      }
    }

    // Find gaps within each working period
    const availableGaps: GapSlot[] = [];

    for (const period of periods) {
      // Get occupied intervals that overlap with this period
      const relevantOccupied = merged.filter(
        o => o.start < period.end && o.end > period.start
      );

      let cursor = period.start;

      for (const occ of relevantOccupied) {
        const occStart = Math.max(occ.start, period.start);
        const occEnd = Math.min(occ.end, period.end);

        if (cursor < occStart) {
          // There's a gap from cursor to occStart
          const gapDuration = occStart - cursor;
          if (gapDuration >= 15) { // Minimum 15 min gap
            availableGaps.push({
              start: minutesToHHMM(cursor),
              end: minutesToHHMM(occStart),
              durationMinutes: gapDuration,
            });
          }
        }
        cursor = Math.max(cursor, occEnd);
      }

      // Check gap after last occupied
      if (cursor < period.end) {
        const gapDuration = period.end - cursor;
        if (gapDuration >= 15) {
          availableGaps.push({
            start: minutesToHHMM(cursor),
            end: minutesToHHMM(period.end),
            durationMinutes: gapDuration,
          });
        }
      }
    }

    return availableGaps;
  }, [currentDate, bookings, blocks, workingHours, overrides]);

  // Filter gaps that can fit the selected service
  const selectedServiceData = services.find(s => s.id === selectedService);
  const fittingGaps = selectedServiceData
    ? gaps.filter(g => g.durationMinutes >= selectedServiceData.duration)
    : gaps;

  const handleSelectGap = (gap: GapSlot) => {
    setSelectedGap(gap);
    setSelectedTime(gap.start);
  };

  const handleCreate = async () => {
    if (!selectedService) {
      toast({ title: 'Erro', description: 'Selecione um serviço', variant: 'destructive' });
      return;
    }
    if (!selectedGap || !selectedTime) {
      toast({ title: 'Erro', description: 'Selecione um horário disponível', variant: 'destructive' });
      return;
    }
    if (isExternalBooking && !externalClientName.trim()) {
      toast({ title: 'Erro', description: 'Informe o nome do cliente', variant: 'destructive' });
      return;
    }
    if (!isExternalBooking && !selectedClient) {
      toast({ title: 'Erro', description: 'Selecione um cliente', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const service = services.find(s => s.id === selectedService);

      const bookingData: any = {
        barbershop_id: barbershopId,
        barber_id: barberId,
        service_id: selectedService,
        booking_date: format(currentDate, 'yyyy-MM-dd'),
        booking_time: selectedTime,
        total_price: service?.price || 0,
        status: 'confirmed',
        notes: notes ? sanitizeString(notes, { maxLength: 500 }) : null,
        is_external_booking: isExternalBooking,
      };

      if (isExternalBooking) {
        bookingData.client_name = sanitizeString(externalClientName, { maxLength: 200 });
      } else {
        bookingData.client_id = selectedClient;
        const clientData = clients.find(c => c.user_id === selectedClient);
        bookingData.client_name = clientData?.display_name || 'Cliente';
      }

      const { error } = await supabase.from('bookings').insert(bookingData);
      if (error) throw error;

      toast({
        title: 'Encaixe criado!',
        description: `Agendamento encaixado às ${selectedTime} com sucesso.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erro ao criar encaixe',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" style={{ color: '#2d044a' }} />
              Encaixe — {format(currentDate, "dd/MM/yyyy (EEEE)", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Step 1: Select service */}
            <div className="space-y-2">
              <Label>Serviço *</Label>
              <Select value={selectedService} onValueChange={(v) => { setSelectedService(v); setSelectedGap(null); setSelectedTime(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {s.duration}min — R$ {s.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Show available gaps */}
            {selectedService && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  Horários disponíveis para encaixe
                </Label>

                {gaps.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    Nenhuma sobra de horário neste dia.
                  </div>
                ) : fittingGaps.length === 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 text-amber-700 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Nenhuma sobra comporta este serviço ({selectedServiceData?.duration}min).
                    </div>
                    <p className="text-xs text-muted-foreground">Sobras disponíveis:</p>
                    {gaps.map((gap, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded border border-dashed text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {gap.start} — {gap.end} ({gap.durationMinutes}min)
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {fittingGaps.map((gap, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectGap(gap)}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-md border text-sm transition-all text-left',
                          selectedGap === gap
                            ? 'border-[#2d044a] bg-[#2d044a]/10 ring-1 ring-[#2d044a]'
                            : 'border-border hover:border-[#2d044a]/50 hover:bg-muted/50'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{gap.start} — {gap.end}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {gap.durationMinutes}min livres
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Adjust time within the gap */}
            {selectedGap && selectedService && (
              <div className="space-y-2">
                <Label>Horário do encaixe</Label>
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  min={selectedGap.start}
                  max={selectedGap.end}
                />
                <p className="text-xs text-muted-foreground">
                  Janela: {selectedGap.start} — {selectedGap.end} ({selectedGap.durationMinutes}min)
                </p>
              </div>
            )}

            {/* Step 4: Client info */}
            {selectedGap && selectedService && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="external-encaixe"
                    checked={isExternalBooking}
                    onCheckedChange={(checked) => setIsExternalBooking(checked as boolean)}
                  />
                  <Label htmlFor="external-encaixe" className="text-sm cursor-pointer">
                    Cliente sem cadastro (externo)
                  </Label>
                </div>

                {isExternalBooking ? (
                  <div className="space-y-2">
                    <Label>Nome do cliente *</Label>
                    <Input
                      value={externalClientName}
                      onChange={(e) => setExternalClientName(e.target.value)}
                      placeholder="Nome do cliente"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Cliente cadastrado *</Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(c => (
                          <SelectItem key={c.user_id} value={c.user_id}>
                            {c.display_name || 'Sem nome'} {c.phone ? `(${c.phone})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() => setCreateClientOpen(true)}
                    >
                      <Plus className="h-3 w-3" />
                      Novo cliente
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observações do encaixe..."
                    rows={2}
                  />
                </div>

                {/* Summary */}
                {selectedServiceData && (
                  <div className="p-3 rounded-md text-sm space-y-1" style={{ backgroundColor: '#2d044a', color: 'white' }}>
                    <p className="font-semibold">Resumo do Encaixe</p>
                    <p>Serviço: {selectedServiceData.name}</p>
                    <p>Horário: {selectedTime} ({selectedServiceData.duration}min)</p>
                    <p>Valor: R$ {selectedServiceData.price.toFixed(2)}</p>
                  </div>
                )}

                <Button
                  onClick={handleCreate}
                  disabled={loading}
                  className="w-full text-white rounded-none"
                  style={{ backgroundColor: '#2d044a' }}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Confirmar Encaixe
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateClientDialog
        open={createClientOpen}
        onOpenChange={setCreateClientOpen}
        onSuccess={() => {
          fetchClients();
          setCreateClientOpen(false);
        }}
      />
    </>
  );
};
