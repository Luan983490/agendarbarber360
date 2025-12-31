import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Clock, 
  Scissors, 
  DollarSign, 
  XCircle, 
  UserX,
  Timer,
  TrendingUp
} from 'lucide-react';

interface AdvancedMetrics {
  total_bookings_completed: number;
  total_revenue: number;
  average_ticket: number;
  total_cancelled: number;
  total_no_show: number;
  cancellation_rate_percent: number;
  no_show_rate_percent: number;
  most_used_service_id: string | null;
  most_used_service_name: string;
  most_used_service_count: number;
  busiest_weekday: number;
  busiest_weekday_count: number;
  busiest_time_slot: string;
  busiest_time_slot_count: number;
  average_service_duration_minutes: number;
}

interface BarberAdvancedMetricsCardProps {
  data: AdvancedMetrics | null;
  loading: boolean;
}

const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function BarberAdvancedMetricsCard({ data, loading }: BarberAdvancedMetricsCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatTime = (time: string) => {
    if (!time || time === '00:00:00') return '-';
    return time.substring(0, 5);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Métricas Avançadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-4">
            Nenhum dado disponível no período.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Métricas Avançadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Metrics Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Most Used Service */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Scissors className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Serviço mais realizado</p>
              <p className="font-medium truncate">{data.most_used_service_name}</p>
              <p className="text-xs text-muted-foreground">{data.most_used_service_count}x</p>
            </div>
          </div>

          {/* Busiest Weekday */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Dia mais movimentado</p>
              <p className="font-medium">{weekdayNames[data.busiest_weekday]}</p>
              <p className="text-xs text-muted-foreground">{data.busiest_weekday_count} atendimentos</p>
            </div>
          </div>

          {/* Busiest Time */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Clock className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Horário mais movimentado</p>
              <p className="font-medium">{formatTime(data.busiest_time_slot)}</p>
              <p className="text-xs text-muted-foreground">{data.busiest_time_slot_count} atendimentos</p>
            </div>
          </div>

          {/* Average Duration */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Timer className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">Duração média</p>
              <p className="font-medium">{Math.round(data.average_service_duration_minutes)} min</p>
              <p className="text-xs text-muted-foreground">por atendimento</p>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Cancellation Rate */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Cancelamento</p>
                <p className="font-medium">{data.cancellation_rate_percent.toFixed(1)}%</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-destructive">{data.total_cancelled}</p>
              <p className="text-xs text-muted-foreground">cancelados</p>
            </div>
          </div>

          {/* No-Show Rate */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <UserX className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Taxa de No-Show</p>
                <p className="font-medium">{data.no_show_rate_percent.toFixed(1)}%</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-orange-500">{data.total_no_show}</p>
              <p className="text-xs text-muted-foreground">não compareceram</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
