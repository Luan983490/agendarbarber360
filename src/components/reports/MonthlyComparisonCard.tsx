import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComparisonData {
  current_revenue: number;
  current_bookings: number;
  current_avg_ticket: number;
  previous_revenue: number;
  previous_bookings: number;
  previous_avg_ticket: number;
  revenue_variation: number;
  bookings_variation: number;
  avg_ticket_variation: number;
}

interface MonthlyComparisonCardProps {
  data: ComparisonData | null;
  loading: boolean;
  currentPeriod?: string;
  previousPeriod?: string;
}

export function MonthlyComparisonCard({ 
  data, 
  loading, 
  currentPeriod = 'Mês atual',
  previousPeriod = 'Mês anterior'
}: MonthlyComparisonCardProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const VariationIndicator = ({ value }: { value: number }) => {
    if (value === 0) {
      return (
        <span className="flex items-center gap-1 text-muted-foreground text-xs">
          <Minus className="h-3 w-3" />
          0%
        </span>
      );
    }
    const isPositive = value > 0;
    return (
      <span className={`flex items-center gap-1 font-semibold text-xs ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </span>
    );
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">
          Comparativo: {currentPeriod} vs {previousPeriod}
        </h2>
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  const metrics = [
    {
      label: 'Faturamento',
      current: formatCurrency(data.current_revenue),
      previous: formatCurrency(data.previous_revenue),
      variation: data.revenue_variation,
    },
    {
      label: 'Atendimentos',
      current: data.current_bookings.toString(),
      previous: data.previous_bookings.toString(),
      variation: data.bookings_variation,
    },
    {
      label: 'Ticket Médio',
      current: formatCurrency(data.current_avg_ticket),
      previous: formatCurrency(data.previous_avg_ticket),
      variation: data.avg_ticket_variation,
    },
  ];

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-4">
        Comparativo: {currentPeriod} vs {previousPeriod}
      </h2>
      <div className="border border-border rounded-xl p-5">
        <div className="grid gap-6 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {metric.label}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-foreground">{metric.current}</p>
                  <p className="text-xs text-muted-foreground">vs {metric.previous}</p>
                </div>
                <VariationIndicator value={metric.variation} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
