import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface RevenueData {
  total_revenue: number;
  total_bookings: number;
  average_ticket: number;
}

interface CancellationData {
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  noshow_bookings: number;
  cancellation_rate: number;
  noshow_rate: number;
}

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

interface ReportsSidebarProps {
  revenueData: RevenueData | null;
  cancellationData: CancellationData | null;
  comparisonData: ComparisonData | null;
  loadingRevenue: boolean;
  loadingCancellation: boolean;
  loadingComparison: boolean;
  variant?: 'default' | 'revenue';
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function VariationBadge({ value }: { value: number }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? '+' : ''}{value.toFixed(0)}%
    </span>
  );
}

export function ReportsSidebar({
  revenueData,
  cancellationData,
  comparisonData,
  loadingRevenue,
  loadingCancellation,
  loadingComparison,
  variant = 'default',
}: ReportsSidebarProps) {
  return (
    <div className="w-full lg:w-[300px] flex-shrink-0 space-y-6">
      {/* Agendamentos Summary Card */}
      {variant === 'default' && (
        <div className="border border-border rounded-xl p-5 space-y-4">
          {loadingRevenue || loadingCancellation ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Agendamentos
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-foreground">
                      {revenueData?.total_bookings || 0}
                    </span>
                    {comparisonData && (
                      <VariationBadge value={comparisonData.bookings_variation} />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Horário reservado
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-foreground">
                      {revenueData?.total_bookings || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Confirmados
                  </p>
                  <span className="text-lg font-bold text-foreground">
                    {cancellationData ? cancellationData.total_bookings - cancellationData.cancelled_bookings - cancellationData.noshow_bookings : 0}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Finalizados
                  </p>
                  <span className="text-lg font-bold text-foreground">
                    {cancellationData?.completed_bookings || 0}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Não comparecimentos
                  </p>
                  <span className="text-lg font-bold text-foreground">
                    {cancellationData?.noshow_bookings || 0}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Cancelados
                  </p>
                  <span className="text-lg font-bold text-foreground">
                    {cancellationData?.cancelled_bookings || 0}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Receita Summary Card */}
      <div className="border border-border rounded-xl p-5 space-y-4">
        {loadingRevenue ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <>
            <h3 className="text-base font-semibold text-foreground">Receita</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Serviços
                </p>
                <span className="text-sm font-bold text-foreground">
                  {formatCurrency(revenueData?.total_revenue || 0)}
                </span>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Ticket Médio
                </p>
                <span className="text-sm font-bold text-foreground">
                  {formatCurrency(revenueData?.average_ticket || 0)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
