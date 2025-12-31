import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Performance por Barbeiro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Performance por Barbeiro
        </CardTitle>
        <CardDescription>
          Comparativo de desempenho entre profissionais
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum dado de performance disponível
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barbeiro</TableHead>
                <TableHead className="text-right">Atendimentos</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((barber) => (
                <TableRow key={barber.barber_id}>
                  <TableCell className="font-medium">{barber.barber_name}</TableCell>
                  <TableCell className="text-right">{barber.total_bookings}</TableCell>
                  <TableCell className="text-right font-medium">
                    R$ {barber.total_revenue.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    R$ {barber.total_bookings > 0 
                      ? (barber.total_revenue / barber.total_bookings).toFixed(2)
                      : '0.00'
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
