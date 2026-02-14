import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';

interface BarberPerformance {
  barber_id: string;
  barber_name: string;
  total_bookings: number;
  total_revenue: number;
}

interface BarberPerformanceTableProps {
  data: BarberPerformance[];
  loading: boolean;
}

export function BarberPerformanceTable({ data, loading }: BarberPerformanceTableProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (loading) {
    return (
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Performance por Barbeiro
        </h2>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        Performance por Barbeiro
      </h2>
      {data.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-border rounded-xl">
          Nenhum dado de performance disponível
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-[11px] uppercase tracking-wider border-b border-border">
                <th className="text-left font-semibold py-3 px-5">Barbeiro</th>
                <th className="text-center font-semibold py-3 px-5">Atendimentos</th>
                <th className="text-right font-semibold py-3 px-5">Faturamento</th>
                <th className="text-right font-semibold py-3 px-5">Ticket Médio</th>
              </tr>
            </thead>
            <tbody>
              {data.map((barber) => (
                <tr key={barber.barber_id} className="border-t border-border hover:bg-accent/30 transition-colors">
                  <td className="py-3 px-5 text-foreground font-medium">{barber.barber_name}</td>
                  <td className="py-3 px-5 text-center text-foreground">{barber.total_bookings}</td>
                  <td className="py-3 px-5 text-right text-foreground font-medium">
                    {formatCurrency(barber.total_revenue)}
                  </td>
                  <td className="py-3 px-5 text-right text-muted-foreground">
                    {formatCurrency(barber.total_bookings > 0 ? barber.total_revenue / barber.total_bookings : 0)}
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
