import { Skeleton } from '@/components/ui/skeleton';

interface ServiceData {
  service_id: string;
  service_name: string;
  total_bookings: number;
  total_revenue: number;
}

interface TopServicesTableProps {
  data: ServiceData[];
  loading: boolean;
}

export function TopServicesTable({ data, loading }: TopServicesTableProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (loading) {
    return (
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">10 serviços mais populares</h2>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-foreground mb-4">10 serviços mais populares</h2>
      {data.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-border rounded-xl">
          Nenhum serviço realizado no período selecionado
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-[11px] uppercase tracking-wider border-b border-border">
                <th className="text-left font-semibold py-3 px-5">Serviço</th>
                <th className="text-center font-semibold py-3 px-5">Reservas</th>
                <th className="text-right font-semibold py-3 px-5">Valor</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 10).map((service) => (
                <tr key={service.service_id} className="border-t border-border hover:bg-accent/30 transition-colors">
                  <td className="py-3 px-5 text-foreground font-medium">{service.service_name}</td>
                  <td className="py-3 px-5 text-center text-primary font-semibold">{service.total_bookings}</td>
                  <td className="py-3 px-5 text-right text-foreground">{formatCurrency(service.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
