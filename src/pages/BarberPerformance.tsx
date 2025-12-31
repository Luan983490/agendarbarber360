import { useState, useEffect } from 'react';
import { useUserAccess } from '@/hooks/useUserAccess';
import { supabase } from '@/integrations/supabase/client';
import { BarberLayout } from '@/components/layouts/BarberLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarberAdvancedMetricsCard } from '@/components/reports/BarberAdvancedMetricsCard';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Scissors,
  UserX
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RevenueData {
  total_revenue: number;
  total_bookings: number;
  average_ticket: number;
}

interface ServiceData {
  service_id: string;
  service_name: string;
  total_bookings: number;
  total_revenue: number;
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

interface AdvancedMetrics {
  total_bookings_completed: number;
  total_revenue: number;
  average_ticket: number;
  total_cancelled: number;
  total_no_show: number;
  cancellation_rate_percent: number;
  no_show_rate_percent: number;
  most_used_service_id: string | null;
  most_used_service_name: string;
  most_used_service_count: number;
  busiest_weekday: number;
  busiest_weekday_count: number;
  busiest_time_slot: string;
  busiest_time_slot_count: number;
  average_service_duration_minutes: number;
}

export default function BarberPerformance() {
  const { barberId, loading: accessLoading } = useUserAccess();
  const [currentTab, setCurrentTab] = useState('performance');
  const navigate = useNavigate();
  
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [servicesData, setServicesData] = useState<ServiceData[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [advancedMetrics, setAdvancedMetrics] = useState<AdvancedMetrics | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [loadingAdvanced, setLoadingAdvanced] = useState(true);

  const currentMonth = new Date();
  const previousMonth = subMonths(currentMonth, 1);

  useEffect(() => {
    if (barberId) {
      fetchAllReports();
    }
  }, [barberId]);

  const fetchAllReports = async () => {
    setLoading(true);
    const currentStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const currentEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    const previousStart = format(startOfMonth(previousMonth), 'yyyy-MM-dd');
    const previousEnd = format(endOfMonth(previousMonth), 'yyyy-MM-dd');

    await Promise.all([
      fetchRevenueReport(currentStart, currentEnd),
      fetchServicesReport(currentStart, currentEnd),
      fetchComparisonReport(currentStart, currentEnd, previousStart, previousEnd),
      fetchAdvancedMetrics(currentStart, currentEnd),
    ]);
    
    setLoading(false);
  };

  const fetchRevenueReport = async (start: string, end: string) => {
    try {
      const { data, error } = await supabase.rpc('get_revenue_report', {
        p_start_date: start,
        p_end_date: end,
        p_barber_filter: null,
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setRevenueData({
          total_revenue: Number(data[0].total_revenue) || 0,
          total_bookings: Number(data[0].total_bookings) || 0,
          average_ticket: Number(data[0].average_ticket) || 0,
        });
      }
    } catch (error) {
      console.error('Erro no relatório de receita:', error);
    }
  };

  const fetchServicesReport = async (start: string, end: string) => {
    try {
      const { data, error } = await supabase.rpc('get_top_services_report', {
        p_start_date: start,
        p_end_date: end,
        p_barber_filter: null,
      });

      if (error) throw error;
      setServicesData(data || []);
    } catch (error) {
      console.error('Erro no relatório de serviços:', error);
    }
  };

  const fetchComparisonReport = async (currentStart: string, currentEnd: string, previousStart: string, previousEnd: string) => {
    try {
      const { data, error } = await supabase.rpc('get_monthly_comparison_report', {
        p_current_start_date: currentStart,
        p_current_end_date: currentEnd,
        p_previous_start_date: previousStart,
        p_previous_end_date: previousEnd,
        p_barber_filter: null,
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setComparisonData(data[0]);
      }
    } catch (error) {
      console.error('Erro no relatório comparativo:', error);
    }
  };

  const fetchAdvancedMetrics = async (start: string, end: string) => {
    setLoadingAdvanced(true);
    try {
      const { data, error } = await supabase.rpc('get_barber_advanced_metrics', {
        p_start_date: start,
        p_end_date: end,
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setAdvancedMetrics(data[0]);
      }
    } catch (error) {
      console.error('Erro nas métricas avançadas:', error);
    } finally {
      setLoadingAdvanced(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (tab === 'hoje') {
      navigate('/barber/hoje');
    } else if (tab === 'agenda') {
      navigate('/barber/agenda');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const VariationBadge = ({ value }: { value: number }) => {
    if (value === 0) return <span className="text-muted-foreground text-sm">-</span>;
    const isPositive = value > 0;
    return (
      <span className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  if (accessLoading || loading) {
    return (
      <BarberLayout currentTab={currentTab} onTabChange={handleTabChange}>
        <div className="flex-1 p-4 lg:p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </BarberLayout>
    );
  }

  return (
    <BarberLayout currentTab={currentTab} onTabChange={handleTabChange}>
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 lg:px-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-xl lg:text-2xl font-bold">Meu Desempenho</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        {/* Cards principais */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Atendimentos Concluídos
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{revenueData?.total_bookings || 0}</div>
              {comparisonData && (
                <div className="flex items-center gap-2 mt-1">
                  <VariationBadge value={comparisonData.bookings_variation} />
                  <span className="text-xs text-muted-foreground">vs mês anterior</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Faturamento do Mês
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenueData?.total_revenue || 0)}</div>
              {comparisonData && (
                <div className="flex items-center gap-2 mt-1">
                  <VariationBadge value={comparisonData.revenue_variation} />
                  <span className="text-xs text-muted-foreground">vs mês anterior</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ticket Médio
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenueData?.average_ticket || 0)}</div>
              {comparisonData && (
                <div className="flex items-center gap-2 mt-1">
                  <VariationBadge value={comparisonData.avg_ticket_variation} />
                  <span className="text-xs text-muted-foreground">vs mês anterior</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Advanced Metrics - NEW */}
        <BarberAdvancedMetricsCard data={advancedMetrics} loading={loadingAdvanced} />

        {/* Serviços mais realizados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Scissors className="h-5 w-5 text-primary" />
              Serviços Mais Realizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {servicesData.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum serviço realizado neste mês.</p>
            ) : (
              <div className="space-y-3">
                {servicesData.slice(0, 5).map((service, index) => (
                  <div key={service.service_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-5">{index + 1}.</span>
                      <span className="font-medium">{service.service_name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">{service.total_bookings}x</span>
                      <span className="font-medium">{formatCurrency(service.total_revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comparativo detalhado */}
        {comparisonData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Comparativo: {format(currentMonth, 'MMM', { locale: ptBR })} vs {format(previousMonth, 'MMM', { locale: ptBR })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Faturamento</p>
                  <p className="text-sm">
                    {formatCurrency(comparisonData.current_revenue)} 
                    <span className="text-muted-foreground"> vs </span>
                    {formatCurrency(comparisonData.previous_revenue)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Atendimentos</p>
                  <p className="text-sm">
                    {comparisonData.current_bookings} 
                    <span className="text-muted-foreground"> vs </span>
                    {comparisonData.previous_bookings}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-sm">
                    {formatCurrency(comparisonData.current_avg_ticket)} 
                    <span className="text-muted-foreground"> vs </span>
                    {formatCurrency(comparisonData.previous_avg_ticket)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </BarberLayout>
  );
}
