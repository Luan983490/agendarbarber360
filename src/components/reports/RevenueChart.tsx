import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BookingData {
  booking_date: string;
  total_bookings: number;
}

interface RevenueData {
  total_revenue: number;
  total_bookings: number;
  average_ticket: number;
}

interface RevenueChartProps {
  bookingsData: BookingData[];
  revenueData: RevenueData | null;
  loading: boolean;
}

export function RevenueChart({ bookingsData, revenueData, loading }: RevenueChartProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (loading) {
    return (
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Receita</h2>
        <Skeleton className="h-[260px] w-full rounded-xl" />
      </div>
    );
  }

  // Use bookings data to create revenue per day (estimate using avg ticket)
  const avgTicket = revenueData?.average_ticket || 0;
  const dailyData = bookingsData.map((item) => ({
    date: format(parseISO(item.booking_date), 'dd/MM', { locale: ptBR }),
    revenue: item.total_bookings * avgTicket,
    bookings: item.total_bookings,
  }));

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-4">Receita</h2>
      <div className="border border-border rounded-xl p-4 pb-2">
        {bookingsData.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            Nenhuma receita no período selecionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(220, 70%, 55%)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(220, 70%, 55%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis 
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(v) => `R$${v}`}
                width={50}
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
                formatter={(value: number) => [formatCurrency(value), 'Receita']}
              />
              <Area 
                type="monotone"
                dataKey="revenue" 
                name="Receita"
                stroke="hsl(220, 70%, 55%)"
                strokeWidth={2.5}
                fill="url(#gradientRevenue)"
                dot={{ r: 5, fill: 'hsl(220, 70%, 55%)', strokeWidth: 3, stroke: 'hsl(var(--background))' }}
                activeDot={{ r: 7, fill: 'hsl(220, 70%, 55%)', strokeWidth: 3, stroke: 'hsl(var(--background))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
