import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Plus, Clock, Calendar as CalendarIcon, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface WorkingHour {
  id?: string;
  barber_id: string;
  day_of_week: number;
  period1_start: string | null;
  period1_end: string | null;
  period2_start: string | null;
  period2_end: string | null;
  is_day_off: boolean;
}

interface ScheduleOverride {
  id: string;
  barber_id: string;
  start_date: string;
  end_date: string;
  day_of_week: number;
  period1_start: string | null;
  period1_end: string | null;
  period2_start: string | null;
  period2_end: string | null;
  is_day_off: boolean;
}

interface BarberWorkingHoursFormProps {
  barberId: string;
  barberName: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

const DEFAULT_HOURS: Omit<WorkingHour, 'id' | 'barber_id'>[] = DAYS_OF_WEEK.map(day => ({
  day_of_week: day.value,
  period1_start: day.value === 0 ? null : '09:00',
  period1_end: day.value === 0 ? null : '12:00',
  period2_start: day.value === 0 ? null : '14:00',
  period2_end: day.value === 0 ? null : '19:00',
  is_day_off: day.value === 0,
}));

export const BarberWorkingHoursForm = ({ barberId, barberName }: BarberWorkingHoursFormProps) => {
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('fixed');
  const { toast } = useToast();

  // State for new override
  const [newOverride, setNewOverride] = useState({
    start_date: '',
    end_date: '',
    day_of_week: 1,
    period1_start: '09:00',
    period1_end: '12:00',
    period2_start: '14:00',
    period2_end: '19:00',
    is_day_off: false,
  });

  useEffect(() => {
    fetchWorkingHours();
    fetchOverrides();
  }, [barberId]);

  const fetchWorkingHours = async () => {
    try {
      const { data, error } = await supabase
        .from('barber_working_hours')
        .select('*')
        .eq('barber_id', barberId)
        .order('day_of_week');

      if (error) throw error;

      if (data && data.length > 0) {
        setWorkingHours(data);
      } else {
        // Initialize with default hours
        const defaultHours = DEFAULT_HOURS.map(h => ({
          ...h,
          barber_id: barberId,
        }));
        setWorkingHours(defaultHours);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar horários",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOverrides = async () => {
    try {
      const { data, error } = await supabase
        .from('barber_schedule_overrides')
        .select('*')
        .eq('barber_id', barberId)
        .order('start_date');

      if (error) throw error;
      setOverrides(data || []);
    } catch (error: any) {
      console.error('Error fetching overrides:', error);
    }
  };

  const handleHourChange = (dayOfWeek: number, field: keyof WorkingHour, value: string | boolean) => {
    setWorkingHours(prev => prev.map(h => 
      h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h
    ));
  };

  const handleToggleDayOff = (dayOfWeek: number) => {
    setWorkingHours(prev => prev.map(h => {
      if (h.day_of_week === dayOfWeek) {
        const newIsDayOff = !h.is_day_off;
        return {
          ...h,
          is_day_off: newIsDayOff,
          period1_start: newIsDayOff ? null : '09:00',
          period1_end: newIsDayOff ? null : '12:00',
          period2_start: newIsDayOff ? null : '14:00',
          period2_end: newIsDayOff ? null : '19:00',
        };
      }
      return h;
    }));
  };

  const saveWorkingHours = async () => {
    setSaving(true);
    try {
      // Delete existing hours and insert new ones
      const { error: deleteError } = await supabase
        .from('barber_working_hours')
        .delete()
        .eq('barber_id', barberId);

      if (deleteError) throw deleteError;

      const hoursToInsert = workingHours.map(h => ({
        barber_id: barberId,
        day_of_week: h.day_of_week,
        period1_start: h.period1_start,
        period1_end: h.period1_end,
        period2_start: h.period2_start,
        period2_end: h.period2_end,
        is_day_off: h.is_day_off,
      }));

      const { error: insertError } = await supabase
        .from('barber_working_hours')
        .insert(hoursToInsert);

      if (insertError) throw insertError;

      toast({
        title: "Horários salvos!",
        description: "Os horários de trabalho foram atualizados com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addOverride = async () => {
    if (!newOverride.start_date || !newOverride.end_date) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe o período de início e fim.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('barber_schedule_overrides')
        .insert({
          barber_id: barberId,
          start_date: newOverride.start_date,
          end_date: newOverride.end_date,
          day_of_week: newOverride.day_of_week,
          period1_start: newOverride.is_day_off ? null : newOverride.period1_start,
          period1_end: newOverride.is_day_off ? null : newOverride.period1_end,
          period2_start: newOverride.is_day_off ? null : newOverride.period2_start,
          period2_end: newOverride.is_day_off ? null : newOverride.period2_end,
          is_day_off: newOverride.is_day_off,
        });

      if (error) throw error;

      toast({
        title: "Período adicionado!",
        description: "O horário especial foi salvo com sucesso."
      });

      setNewOverride({
        start_date: '',
        end_date: '',
        day_of_week: 1,
        period1_start: '09:00',
        period1_end: '12:00',
        period2_start: '14:00',
        period2_end: '19:00',
        is_day_off: false,
      });

      fetchOverrides();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteOverride = async (id: string) => {
    try {
      const { error } = await supabase
        .from('barber_schedule_overrides')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Período removido",
        description: "O horário especial foi excluído."
      });

      fetchOverrides();
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return time.substring(0, 5);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fixed" className="gap-2">
            <Clock className="h-4 w-4" />
            Fixo
          </TabsTrigger>
          <TabsTrigger value="period" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            Por período
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fixed" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Horário Semanal Fixo</CardTitle>
              <CardDescription>
                Configure os horários de trabalho para cada dia da semana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mobile: Card layout */}
                <div className="md:hidden space-y-3">
                  {workingHours.map((hour) => {
                    const day = DAYS_OF_WEEK.find(d => d.value === hour.day_of_week);
                    return (
                      <div 
                        key={hour.day_of_week} 
                        className={cn(
                          "p-3 rounded-lg border",
                          hour.is_day_off ? "bg-muted/50" : "bg-background"
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-sm">{day?.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Folga</span>
                            <Switch
                              checked={hour.is_day_off}
                              onCheckedChange={() => handleToggleDayOff(hour.day_of_week)}
                            />
                          </div>
                        </div>
                        {!hour.is_day_off && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">Entrada 1</Label>
                                <Input
                                  type="time"
                                  value={hour.period1_start || ''}
                                  onChange={(e) => handleHourChange(hour.day_of_week, 'period1_start', e.target.value)}
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Saída 1</Label>
                                <Input
                                  type="time"
                                  value={hour.period1_end || ''}
                                  onChange={(e) => handleHourChange(hour.day_of_week, 'period1_end', e.target.value)}
                                  className="h-9"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">Entrada 2</Label>
                                <Input
                                  type="time"
                                  value={hour.period2_start || ''}
                                  onChange={(e) => handleHourChange(hour.day_of_week, 'period2_start', e.target.value)}
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Saída 2</Label>
                                <Input
                                  type="time"
                                  value={hour.period2_end || ''}
                                  onChange={(e) => handleHourChange(hour.day_of_week, 'period2_end', e.target.value)}
                                  className="h-9"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        {hour.is_day_off && (
                          <p className="text-sm text-muted-foreground text-center py-2">Dia de folga</p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop: Table layout */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Dia</TableHead>
                        <TableHead>Entrada 1</TableHead>
                        <TableHead>Saída 1</TableHead>
                        <TableHead>Entrada 2</TableHead>
                        <TableHead>Saída 2</TableHead>
                        <TableHead className="text-center w-[80px]">Folga</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workingHours.map((hour) => {
                        const day = DAYS_OF_WEEK.find(d => d.value === hour.day_of_week);
                        return (
                          <TableRow key={hour.day_of_week}>
                            <TableCell className="font-medium">{day?.label}</TableCell>
                            <TableCell>
                              <Input
                                type="time"
                                value={hour.period1_start || ''}
                                onChange={(e) => handleHourChange(hour.day_of_week, 'period1_start', e.target.value)}
                                disabled={hour.is_day_off}
                                className="w-[92px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="time"
                                value={hour.period1_end || ''}
                                onChange={(e) => handleHourChange(hour.day_of_week, 'period1_end', e.target.value)}
                                disabled={hour.is_day_off}
                                className="w-[92px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="time"
                                value={hour.period2_start || ''}
                                onChange={(e) => handleHourChange(hour.day_of_week, 'period2_start', e.target.value)}
                                disabled={hour.is_day_off}
                                className="w-[92px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="time"
                                value={hour.period2_end || ''}
                                onChange={(e) => handleHourChange(hour.day_of_week, 'period2_end', e.target.value)}
                                disabled={hour.is_day_off}
                                className="w-[92px]"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={hour.is_day_off}
                                onCheckedChange={() => handleToggleDayOff(hour.day_of_week)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <Button onClick={saveWorkingHours} disabled={saving} className="w-full">
                  {saving ? 'Salvando...' : 'Salvar Horários'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="period" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Horário por Período</CardTitle>
              <CardDescription>
                Configure horários especiais para períodos específicos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new override form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={newOverride.start_date}
                    onChange={(e) => setNewOverride(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={newOverride.end_date}
                    onChange={(e) => setNewOverride(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Dia da Semana</Label>
                  <Select
                    value={String(newOverride.day_of_week)}
                    onValueChange={(v) => setNewOverride(prev => ({ ...prev, day_of_week: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(day => (
                        <SelectItem key={day.value} value={String(day.value)}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={newOverride.is_day_off}
                    onCheckedChange={(checked) => setNewOverride(prev => ({ ...prev, is_day_off: checked }))}
                  />
                  <Label>Folga</Label>
                </div>

                {!newOverride.is_day_off && (
                  <>
                    <div>
                      <Label>Entrada Período 1</Label>
                      <Input
                        type="time"
                        value={newOverride.period1_start}
                        onChange={(e) => setNewOverride(prev => ({ ...prev, period1_start: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Saída Período 1</Label>
                      <Input
                        type="time"
                        value={newOverride.period1_end}
                        onChange={(e) => setNewOverride(prev => ({ ...prev, period1_end: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Entrada Período 2</Label>
                      <Input
                        type="time"
                        value={newOverride.period2_start}
                        onChange={(e) => setNewOverride(prev => ({ ...prev, period2_start: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Saída Período 2</Label>
                      <Input
                        type="time"
                        value={newOverride.period2_end}
                        onChange={(e) => setNewOverride(prev => ({ ...prev, period2_end: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <Button onClick={addOverride} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Período
                  </Button>
                </div>
              </div>

              {/* Overrides list - Mobile Cards */}
              {overrides.length > 0 && (
                <div className="space-y-3">
                  {/* Mobile: Card layout */}
                  <div className="md:hidden space-y-3">
                    {overrides.map((override) => {
                      const day = DAYS_OF_WEEK.find(d => d.value === override.day_of_week);
                      return (
                        <div key={override.id} className="p-3 rounded-lg border bg-background">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{day?.label}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteOverride(override.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground text-xs">Período 1:</span>
                              <p>
                                {override.is_day_off ? (
                                  <Badge variant="secondary" className="mt-1">Folga</Badge>
                                ) : (
                                  `${formatTime(override.period1_start)} - ${formatTime(override.period1_end)}`
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Período 2:</span>
                              <p>{override.is_day_off ? '-' : `${formatTime(override.period2_start)} - ${formatTime(override.period2_end)}`}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">De:</span>
                              <p>{format(new Date(override.start_date + 'T00:00:00'), 'dd/MM/yyyy')}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground text-xs">Até:</span>
                              <p>{format(new Date(override.end_date + 'T00:00:00'), 'dd/MM/yyyy')}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop: Table layout */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dia</TableHead>
                          <TableHead>Período 1</TableHead>
                          <TableHead>Período 2</TableHead>
                          <TableHead>De</TableHead>
                          <TableHead>Até</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overrides.map((override) => {
                          const day = DAYS_OF_WEEK.find(d => d.value === override.day_of_week);
                          return (
                            <TableRow key={override.id}>
                              <TableCell className="font-medium">{day?.label}</TableCell>
                              <TableCell>
                                {override.is_day_off ? (
                                  <Badge variant="secondary">Folga</Badge>
                                ) : (
                                  `${formatTime(override.period1_start)} - ${formatTime(override.period1_end)}`
                                )}
                              </TableCell>
                              <TableCell>
                                {override.is_day_off ? '-' : `${formatTime(override.period2_start)} - ${formatTime(override.period2_end)}`}
                              </TableCell>
                              <TableCell>{format(new Date(override.start_date + 'T00:00:00'), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>{format(new Date(override.end_date + 'T00:00:00'), 'dd/MM/yyyy')}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteOverride(override.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {overrides.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum horário especial configurado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BarberWorkingHoursForm;
