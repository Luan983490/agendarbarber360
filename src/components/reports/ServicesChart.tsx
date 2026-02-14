import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface ServiceData {
  service_id: string;
  service_name: string;
  total_bookings: number;
  total_revenue: number;
}

interface ServicesChartProps {
  data: ServiceData[];
  loading: boolean;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(160, 60%, 45%)',
  'hsl(220, 70%, 55%)',
  'hsl(340, 65%, 55%)',
  'hsl(280, 55%, 55%)',
  'hsl(30, 80%, 55%)',
  'hsl(190, 60%, 50%)',
  'hsl(100, 50%, 45%)',
];

export function ServicesChart({ data, loading }: ServicesChartProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (loading) {
    return (
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Serviços por volume</h2>
        <Skeleton className="h-[260px] w-full rounded-xl" />
      </div>
    );
  }

  const top = data.slice(0, 8);

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-4">Serviços por volume</h2>
      <div className="border border-border rounded-xl p-4">
        {top.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            Nenhum serviço no período
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={top}
                  dataKey="total_bookings"
                  nameKey="service_name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {top.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}
                  formatter={(value: number, name: string) => [value, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {top.map((s, i) => (
                <div key={s.service_id} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="text-foreground truncate flex-1">{s.service_name}</span>
                  <span className="text-muted-foreground text-xs">{s.total_bookings}x</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
