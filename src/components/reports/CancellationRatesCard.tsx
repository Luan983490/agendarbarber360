import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface CancellationData {
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  noshow_bookings: number;
  cancellation_rate: number;
  noshow_rate: number;
}

interface CancellationRatesCardProps {
  data: CancellationData | null;
  loading: boolean;
}

export function CancellationRatesCard({ data, loading }: CancellationRatesCardProps) {
  if (loading) {
    return (
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">Destaques</h2>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  const total = data.total_bookings || 1;
  const incompleteCount = data.total_bookings - data.completed_bookings - data.cancelled_bookings - data.noshow_bookings;
  const completedPercent = ((data.completed_bookings / total) * 100);
  const cancelledPercent = ((data.cancelled_bookings / total) * 100);
  const noshowPercent = ((data.noshow_bookings / total) * 100);
  const incompletePercent = Math.max(0, ((incompleteCount / total) * 100));

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const statuses = [
    {
      label: 'Incompleto',
      color: 'bg-blue-500',
      dotColor: 'bg-blue-500',
      count: Math.max(0, incompleteCount),
      percent: incompletePercent,
      value: 0,
    },
    {
      label: 'Completo / finalizado',
      color: 'bg-emerald-500',
      dotColor: 'bg-emerald-500',
      count: data.completed_bookings,
      percent: completedPercent,
      value: 0,
    },
    {
      label: 'Não comparecimentos',
      color: 'bg-amber-400',
      dotColor: 'bg-amber-400',
      count: data.noshow_bookings,
      percent: noshowPercent,
      value: 0,
    },
    {
      label: 'Cancelado',
      color: 'bg-zinc-400',
      dotColor: 'bg-zinc-400',
      count: data.cancelled_bookings,
      percent: cancelledPercent,
      value: 0,
    },
  ];

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-4">Destaques</h2>
      <div className="border border-border rounded-xl p-5 space-y-4">
        {/* Stacked Progress Bar */}
        <div className="flex w-full h-3 rounded-full overflow-hidden bg-muted">
          {statuses.map((s) => (
            s.percent > 0 && (
              <div
                key={s.label}
                className={`${s.color} h-full transition-all`}
                style={{ width: `${s.percent}%` }}
              />
            )
          ))}
        </div>

        {/* Status Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-[11px] uppercase tracking-wider">
              <th className="text-left font-semibold pb-2">Status do agendamento</th>
              <th className="text-center font-semibold pb-2">Quantidade</th>
              <th className="text-center font-semibold pb-2">Porcentagem</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((s) => (
              <tr key={s.label} className="border-t border-border">
                <td className="py-3 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${s.dotColor} flex-shrink-0`} />
                  <span className="text-foreground">{s.label}</span>
                </td>
                <td className="py-3 text-center text-foreground font-medium">{s.count}</td>
                <td className="py-3 text-center text-foreground">{s.percent.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
