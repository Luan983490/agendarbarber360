import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    );
  }

  const getOccupancyColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Ocupação da Agenda
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum dado de ocupação disponível.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barbeiro</TableHead>
                <TableHead className="text-right">Horas Disp.</TableHead>
                <TableHead className="text-right">Horas Ocup.</TableHead>
                <TableHead className="w-[180px]">Ocupação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.barber_id}>
                  <TableCell className="font-medium">{row.barber_name}</TableCell>
                  <TableCell className="text-right">{row.available_hours.toFixed(1)}h</TableCell>
                  <TableCell className="text-right">{row.occupied_hours.toFixed(1)}h</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={Math.min(row.occupancy_rate, 100)} 
                        className={`h-2 flex-1 [&>div]:${getOccupancyColor(row.occupancy_rate)}`}
                      />
                      <span className="text-sm font-medium w-12 text-right">
                        {row.occupancy_rate.toFixed(0)}%
                      </span>
                    </div>
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
