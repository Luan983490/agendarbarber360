import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Clock } from 'lucide-react';

interface OccupancyData {
  barber_id: string;
  barber_name: string;
  available_hours: number;
  occupied_hours: number;
  occupancy_rate: number;
}

interface OccupancyTableProps {
  data: OccupancyData[];
  loading: boolean;
}

export function OccupancyTable({ data, loading }: OccupancyTableProps) {
  if (loading) {
    return (
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Ocupação da Agenda
        </h2>
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  const getOccupancyColor = (rate: number) => {
    if (rate >= 80) return 'bg-emerald-500';
    if (rate >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        Ocupação da Agenda
      </h2>
      {data.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-border rounded-xl">
          Nenhum dado de ocupação disponível.
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-[11px] uppercase tracking-wider border-b border-border">
                <th className="text-left font-semibold py-3 px-5">Barbeiro</th>
                <th className="text-right font-semibold py-3 px-5">Horas Disp.</th>
                <th className="text-right font-semibold py-3 px-5">Horas Ocup.</th>
                <th className="font-semibold py-3 px-5 w-[180px]">Ocupação</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.barber_id} className="border-t border-border hover:bg-accent/30 transition-colors">
                  <td className="py-3 px-5 text-foreground font-medium">{row.barber_name}</td>
                  <td className="py-3 px-5 text-right text-foreground">{row.available_hours.toFixed(1)}h</td>
                  <td className="py-3 px-5 text-right text-foreground">{row.occupied_hours.toFixed(1)}h</td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={Math.min(row.occupancy_rate, 100)} 
                        className={`h-2 flex-1 [&>div]:${getOccupancyColor(row.occupancy_rate)}`}
                      />
                      <span className="text-sm font-medium w-12 text-right text-foreground">
                        {row.occupancy_rate.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
