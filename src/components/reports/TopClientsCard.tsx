import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Clock, Calendar } from 'lucide-react';

interface TopClientData {
  client_id: string;
  client_name: string;
  total_bookings: number;
  total_revenue: number;
  profitable_weekday: number;
  profitable_weekday_revenue: number;
  profitable_time_slot: string;
  profitable_time_slot_revenue: number;
}

interface TopClientsCardProps {
  data: TopClientData[];
  loading: boolean;
}

const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function TopClientsCard({ data, loading }: TopClientsCardProps) {
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

  // Get profitable insights from first row (same for all rows)
  const profitableWeekday = data.length > 0 ? weekdayNames[data[0].profitable_weekday] : '-';
  const profitableTime = data.length > 0 ? formatTime(data[0].profitable_time_slot) : '-';
  const weekdayRevenue = data.length > 0 ? data[0].profitable_weekday_revenue : 0;
  const timeRevenue = data.length > 0 ? data[0].profitable_time_slot_revenue : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Top Clientes & Horários Lucrativos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profitable Insights */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Dia mais lucrativo</p>
              <p className="font-medium">{profitableWeekday}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(weekdayRevenue)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Horário mais lucrativo</p>
              <p className="font-medium">{profitableTime}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(timeRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Top Clients Table */}
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            Nenhum cliente encontrado no período.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Atendimentos</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((client, index) => (
                <TableRow key={client.client_id || index}>
                  <TableCell className="font-medium text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{client.client_name}</TableCell>
                  <TableCell className="text-right">{client.total_bookings}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(client.total_revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
