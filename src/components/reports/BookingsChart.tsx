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
        <Skeleton className="h-[280px] w-full rounded-xl" />
      </div>
    );
  }

  // Build monthly aggregated data for a year view (like Booksy)
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthNames = ['JAN.', 'FEV.', 'MAR.', 'ABR.', 'MAI.', 'JUN.', 'JUL.', 'AGO.', 'SET.', 'OUT.', 'NOV.', 'DEZ.'];
    const monthBookings = data.filter(item => {
      const d = parseISO(item.booking_date);
      return d.getMonth() === i;
    });
    const total = monthBookings.reduce((sum, b) => sum + b.total_bookings, 0);
    return { month: monthNames[i], total_bookings: total };
  });

  // Daily view for detail
  const dailyData = data.map((item) => ({
    ...item,
    date: format(parseISO(item.booking_date), 'dd/MM', { locale: ptBR }),
  }));

  // Use daily if < 35 data points, otherwise monthly
  const chartData = data.length <= 35 ? dailyData : monthlyData;
  const dataKey = data.length <= 35 ? 'date' : 'month';

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-4">Agendamentos e horário reservado</h2>
      <div className="border border-border rounded-xl p-4 pb-2">
        {data.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            Nenhum agendamento no período selecionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey={dataKey}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                allowDecimals={false}
                width={30}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '13px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                itemStyle={{ color: 'hsl(160, 60%, 45%)' }}
              />
              <Area 
                type="monotone"
                dataKey="total_bookings" 
                name="Agendamentos"
                stroke="hsl(160, 60%, 45%)"
                strokeWidth={2.5}
                fill="url(#gradientBookings)"
                dot={{ r: 5, fill: 'hsl(160, 60%, 45%)', strokeWidth: 3, stroke: 'hsl(var(--background))' }}
                activeDot={{ r: 7, fill: 'hsl(160, 60%, 45%)', strokeWidth: 3, stroke: 'hsl(var(--background))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
