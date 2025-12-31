import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { XCircle, UserX } from 'lucide-react';

interface CancellationData {
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  noshow_bookings: number;
  cancellation_rate: number;
  noshow_rate: number;
}

interface CancellationRatesCardProps {
  data: CancellationData | null;
  loading: boolean;
}

export function CancellationRatesCard({ data, loading }: CancellationRatesCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Taxa de Cancelamento e No-Show</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Cancelamentos */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-orange-500" />
              <span className="font-medium">Cancelamentos</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {data.cancelled_bookings} de {data.total_bookings} agendamentos
                </span>
                <span className="font-semibold text-orange-600">
                  {data.cancellation_rate.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={data.cancellation_rate} 
                className="h-2 [&>div]:bg-orange-500"
              />
            </div>
          </div>

          {/* No-Show */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-red-500" />
              <span className="font-medium">No-Show</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {data.noshow_bookings} de {data.total_bookings} agendamentos
                </span>
                <span className="font-semibold text-red-600">
                  {data.noshow_rate.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={data.noshow_rate} 
                className="h-2 [&>div]:bg-red-500"
              />
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Atendimentos concluídos</span>
            <span className="font-semibold text-green-600">
              {data.completed_bookings} ({data.total_bookings > 0 
                ? ((data.completed_bookings / data.total_bookings) * 100).toFixed(1) 
                : 0}%)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
