import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface BookingData {
  booking_date: string;
  total_bookings: number;
}

interface ClientsChartSectionProps {
  topClientsData: TopClientData[];
  bookingsData: BookingData[];
  loading: boolean;
  monthLabel: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function ClientsChartSection({ topClientsData, bookingsData, loading, monthLabel }: ClientsChartSectionProps) {
  const totalClients = topClientsData.length;
  const recurringClients = topClientsData.filter(c => c.total_bookings > 1).length;
  const newClients = totalClients - recurringClients;
  const totalAll = newClients + recurringClients || 1;
  const newPercent = ((newClients / totalAll) * 100).toFixed(0);
  const recurringPercent = ((recurringClients / totalAll) * 100).toFixed(0);

  // Build monthly data for clients chart (simple line)
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthNames = ['JAN.', 'FEV.', 'MAR.', 'ABR.', 'MAI.', 'JUN.', 'JUL.', 'AGO.', 'SET.', 'OUT.', 'NOV.', 'DEZ.'];
    const monthBookings = bookingsData.filter(item => {
      const d = parseISO(item.booking_date);
      return d.getMonth() === i;
    });
    // Approximate unique clients as unique dates with bookings
    const uniqueDates = new Set(monthBookings.map(b => b.booking_date));
    return { month: monthNames[i], clients: uniqueDates.size };
  });

  // Bar chart data for new vs recurring
  const barData = Array.from({ length: 12 }, (_, i) => {
    const monthNames = ['JAN.', 'FEV.', 'MAR.', 'ABR.', 'MAI.', 'JUN.', 'JUL.', 'AGO.', 'SET.', 'OUT.', 'NOV.', 'DEZ.'];
    return { month: monthNames[i], novos: 0, recorrentes: 0 };
  });

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-[280px] w-full rounded-xl" />
        <Skeleton className="h-[280px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Clients count chart */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">
          Clientes • <span className="capitalize">{monthLabel}</span>
        </h2>
        <div className="border border-border rounded-xl p-4 pb-2">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientClients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(270, 60%, 55%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(270, 60%, 55%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
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
              />
              <Area
                type="monotone"
                dataKey="clients"
                name="Clientes"
                stroke="hsl(270, 60%, 55%)"
                strokeWidth={2.5}
                fill="url(#gradientClients)"
                dot={{ r: 5, fill: 'hsl(270, 60%, 55%)', strokeWidth: 3, stroke: 'hsl(var(--background))' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Clients new vs recurring bar chart */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Clientes novos e recorrentes</h2>
        <div className="border border-border rounded-xl p-4 pb-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
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
              />
              <Bar dataKey="novos" name="Novos" fill="hsl(220, 70%, 55%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="recorrentes" name="Recorrentes" fill="hsl(160, 60%, 45%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue by client type table */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Receita total por tipo de venda</h2>
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-[11px] uppercase tracking-wider border-b border-border">
                <th className="text-left font-semibold py-3 px-5">Tipo</th>
                <th className="text-center font-semibold py-3 px-5">%</th>
                <th className="text-right font-semibold py-3 px-5">Clientes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="py-3 px-5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-foreground">Novos</span>
                </td>
                <td className="py-3 px-5 text-center text-foreground">{newPercent}%</td>
                <td className="py-3 px-5 text-right text-foreground font-medium">{newClients}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-3 px-5 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="text-foreground">Recorrentes</span>
                </td>
                <td className="py-3 px-5 text-center text-foreground">{recurringPercent}%</td>
                <td className="py-3 px-5 text-right text-foreground font-medium">{recurringClients}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
