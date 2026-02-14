import { Skeleton } from '@/components/ui/skeleton';
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
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatTime = (time: string) => {
    if (!time || time === '00:00:00') return '-';
    return time.substring(0, 5);
  };

  const profitableWeekday = data.length > 0 ? weekdayNames[data[0].profitable_weekday] : '-';
  const profitableTime = data.length > 0 ? formatTime(data[0].profitable_time_slot) : '-';
  const weekdayRevenue = data.length > 0 ? data[0].profitable_weekday_revenue : 0;
  const timeRevenue = data.length > 0 ? data[0].profitable_time_slot_revenue : 0;

  if (loading) {
    return (
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Top Clientes & Horários Lucrativos
        </h2>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profitable Insights */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Insights de Lucratividade
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3 p-4 border border-border rounded-xl">
            <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Dia mais lucrativo</p>
              <p className="font-medium text-foreground">{profitableWeekday}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(weekdayRevenue)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 border border-border rounded-xl">
            <Clock className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Horário mais lucrativo</p>
              <p className="font-medium text-foreground">{profitableTime}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(timeRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Clients Table */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">
          Top 10 clientes por volume de negócios
        </h2>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-border rounded-xl">
            Nenhum cliente encontrado no período.
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-[11px] uppercase tracking-wider border-b border-border">
                  <th className="text-left font-semibold py-3 px-5 w-12">#</th>
                  <th className="text-left font-semibold py-3 px-5">Cliente</th>
                  <th className="text-center font-semibold py-3 px-5">Atendimentos</th>
                  <th className="text-right font-semibold py-3 px-5">Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {data.map((client, index) => (
                  <tr key={client.client_id || index} className="border-t border-border hover:bg-accent/30 transition-colors">
                    <td className="py-3 px-5 text-muted-foreground font-medium">{index + 1}</td>
                    <td className="py-3 px-5 text-foreground font-medium">{client.client_name}</td>
                    <td className="py-3 px-5 text-center text-foreground">{client.total_bookings}</td>
                    <td className="py-3 px-5 text-right text-foreground font-medium">{formatCurrency(client.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
