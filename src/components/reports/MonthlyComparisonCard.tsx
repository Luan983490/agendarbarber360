import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const VariationIndicator = ({ value }: { value: number }) => {
    if (value === 0) {
      return (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Minus className="h-4 w-4" />
          0%
        </span>
      );
    }
    const isPositive = value > 0;
    return (
      <span className={`flex items-center gap-1 font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </span>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Comparativo: {currentPeriod} vs {previousPeriod}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">{metric.current}</p>
                  <p className="text-xs text-muted-foreground">vs {metric.previous}</p>
                </div>
                <VariationIndicator value={metric.variation} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
