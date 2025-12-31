import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ExportReportsButtonProps {
  startDate: Date;
  endDate: Date;
}

type ReportType = 'bookings' | 'revenue' | 'services' | 'barbers';

export function ExportReportsButton({ startDate, endDate }: ExportReportsButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<ReportType | null>(null);

  const exportToCSV = async (reportType: ReportType) => {
    setLoading(reportType);
    try {
      const { data, error } = await supabase.rpc('get_exportable_report_data', {
        p_report_type: reportType,
        p_start_date: format(startDate, 'yyyy-MM-dd'),
        p_end_date: format(endDate, 'yyyy-MM-dd'),
      });

      if (error) throw error;

      const reportData = data as any;
      let csvContent = '';
      let fileName = `relatorio_${reportType}_${format(startDate, 'yyyyMMdd')}_${format(endDate, 'yyyyMMdd')}.csv`;

      if (reportType === 'bookings' && reportData.data) {
        csvContent = 'Data;Horário;Status;Valor;Cliente;Barbeiro;Serviço\n';
        reportData.data.forEach((row: any) => {
          csvContent += `${row.booking_date};${row.booking_time};${row.status};${row.total_price};${row.client_name};${row.barber_name};${row.service_name}\n`;
        });
      } else if (reportType === 'revenue' && reportData.by_date) {
        csvContent = 'Data;Faturamento;Agendamentos\n';
        reportData.by_date.forEach((row: any) => {
          csvContent += `${row.booking_date};${row.revenue};${row.bookings}\n`;
        });
        csvContent += `\nResumo\n`;
        csvContent += `Total Faturamento;${reportData.summary.total_revenue}\n`;
        csvContent += `Total Agendamentos;${reportData.summary.total_bookings}\n`;
        csvContent += `Ticket Médio;${reportData.summary.average_ticket}\n`;
      } else if (reportType === 'services' && reportData.data) {
        csvContent = 'Serviço;Agendamentos;Faturamento\n';
        reportData.data.forEach((row: any) => {
          csvContent += `${row.name};${row.total_bookings};${row.total_revenue}\n`;
        });
      } else if (reportType === 'barbers' && reportData.data) {
        csvContent = 'Barbeiro;Agendamentos;Faturamento;Ticket Médio\n';
        reportData.data.forEach((row: any) => {
          csvContent += `${row.name};${row.total_bookings};${row.total_revenue};${row.average_ticket}\n`;
        });
      }

      // Create and download file
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Exportação concluída',
        description: `Relatório de ${getReportLabel(reportType)} exportado com sucesso.`,
      });
    } catch (error: any) {
      console.error('Erro na exportação:', error);
      toast({
        title: 'Erro na exportação',
        description: error.message || 'Não foi possível exportar o relatório.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const getReportLabel = (type: ReportType) => {
    switch (type) {
      case 'bookings':
        return 'Agendamentos';
      case 'revenue':
        return 'Faturamento';
      case 'services':
        return 'Serviços';
      case 'barbers':
        return 'Barbeiros';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading !== null}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => exportToCSV('bookings')}
          disabled={loading !== null}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Agendamentos (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => exportToCSV('revenue')}
          disabled={loading !== null}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Faturamento (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => exportToCSV('services')}
          disabled={loading !== null}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Serviços (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => exportToCSV('barbers')}
          disabled={loading !== null}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Barbeiros (CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
