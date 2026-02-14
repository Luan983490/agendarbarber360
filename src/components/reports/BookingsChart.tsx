import { Card, CardContent } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BookingData {
  booking_date: string;
  total_bookings: number;
}

interface BookingsChartProps {
  data: BookingData[];
  loading: boolean;
}

export function BookingsChart({ data, loading }: BookingsChartProps) {
  if (loading) {
    return (
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Agendamentos e horário reservado</h2>
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </div>
    );
  }

  const chartData = data.map((item) => ({
    ...item,
    date: format(parseISO(item.booking_date), 'dd/MM', { locale: ptBR }),
  }));

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-4">Agendamentos e horário reservado</h2>
      {data.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-border rounded-xl">
          Nenhum agendamento no período selecionado
        </div>
      ) : (
        <div className="border border-border rounded-xl p-4">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '13px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area 
                type="monotone"
                dataKey="total_bookings" 
                name="Agendamentos"
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fill="url(#colorBookings)"
                dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
