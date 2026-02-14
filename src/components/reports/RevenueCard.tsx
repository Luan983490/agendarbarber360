import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';

interface RevenueData {
  total_revenue: number;
  total_bookings: number;
  average_ticket: number;
}

interface RevenueCardProps {
  data: RevenueData | null;
  loading: boolean;
}

export function RevenueCard({ data, loading }: RevenueCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-border rounded-xl p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: 'Faturamento Total',
      value: formatCurrency(data?.total_revenue || 0),
      icon: DollarSign,
      highlight: true,
    },
    {
      label: 'Total de Agendamentos',
      value: (data?.total_bookings || 0).toString(),
      icon: Calendar,
      highlight: false,
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(data?.average_ticket || 0),
      icon: TrendingUp,
      highlight: false,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {metric.label}
            </p>
            <metric.icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className={`text-2xl font-bold ${metric.highlight ? 'text-primary' : 'text-foreground'}`}>
            {metric.value}
          </p>
        </div>
      ))}
    </div>
  );
}
