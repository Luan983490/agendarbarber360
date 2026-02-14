import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useUserAccess } from '@/hooks/useUserAccess';
import { useToast } from '@/hooks/use-toast';
import { RevenueCard } from './RevenueCard';
import { TopServicesTable } from './TopServicesTable';
import { BarberPerformanceTable } from './BarberPerformanceTable';
import { BookingsChart } from './BookingsChart';
import { MonthlyComparisonCard } from './MonthlyComparisonCard';
import { CancellationRatesCard } from './CancellationRatesCard';
import { OccupancyTable } from './OccupancyTable';
import { TopClientsCard } from './TopClientsCard';
import { AlertsCard } from './AlertsCard';
import { AuditTimelineCard } from './AuditTimelineCard';
import { ExportReportsButton } from './ExportReportsButton';
import { ReportsSidebar } from './ReportsSidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Barber {
  id: string;
  name: string;
}

interface ReportsPageProps {
  barbershopId: string;
}

interface RevenueData {
  total_revenue: number;
  total_bookings: number;
  average_ticket: number;
}

interface BookingData {
  booking_date: string;
  total_bookings: number;
}

interface ServiceData {
  service_id: string;
  service_name: string;
  total_bookings: number;
  total_revenue: number;
}

interface BarberPerformance {
  barber_id: string;
  barber_name: string;
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

interface CancellationData {
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  noshow_bookings: number;
  cancellation_rate: number;
  noshow_rate: number;
}

interface OccupancyData {
  barber_id: string;
  barber_name: string;
  available_hours: number;
  occupied_hours: number;
  occupancy_rate: number;
}

interface TopClientData {
  client_id: string;
  client_name: string;
  total_bookings: number;
  total_revenue: number;
  profitable_weekday: number;
  profitable_weekday_revenue: number;
  profitable_time_slot: string;
  profitable_time_slot_revenue: number;
}

interface AuditLog {
  booking_id: string;
  action: string;
  old_status: string | null;
  new_status: string | null;
  actor_role: string;
  origin: string;
  created_at: string;
  client_name: string;
  barber_name: string;
}

export function ReportsPage({ barbershopId }: ReportsPageProps) {
  const { role, barberId } = useUserAccess();
  const { toast } = useToast();
  const isOwnerOrAdmin = role === 'owner';
  
  // Month-based navigation
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);
  
  // Barber filter (only for owner/admin)
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('all');
  
  // Data states
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [bookingsData, setBookingsData] = useState<BookingData[]>([]);
  const [servicesData, setServicesData] = useState<ServiceData[]>([]);
  const [performanceData, setPerformanceData] = useState<BarberPerformance[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [cancellationData, setCancellationData] = useState<CancellationData | null>(null);
  const [occupancyData, setOccupancyData] = useState<OccupancyData[]>([]);
  const [topClientsData, setTopClientsData] = useState<TopClientData[]>([]);
  const [auditData, setAuditData] = useState<AuditLog[]>([]);
  
  // Loading states
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingPerformance, setLoadingPerformance] = useState(true);
  const [loadingComparison, setLoadingComparison] = useState(true);
  const [loadingCancellation, setLoadingCancellation] = useState(true);
  const [loadingOccupancy, setLoadingOccupancy] = useState(true);
  const [loadingTopClients, setLoadingTopClients] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(true);

  const goToPreviousMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  // Fetch barbers for filter (owner/admin only)
  useEffect(() => {
    if (isOwnerOrAdmin) {
      fetchBarbers();
    }
  }, [isOwnerOrAdmin, barbershopId]);

  // Fetch reports when filters change
  useEffect(() => {
    fetchReports();
  }, [currentMonth, selectedBarberId, role, barberId]);

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBarbers(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar barbeiros:', error);
    }
  };

  const fetchReports = async () => {
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    const barberFilter = selectedBarberId === 'all' ? null : selectedBarberId;
    
    const monthsDiff = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));
    const previousStart = subMonths(startDate, monthsDiff);
    const previousEnd = subMonths(endDate, monthsDiff);
    const previousStartStr = format(previousStart, 'yyyy-MM-dd');
    const previousEndStr = format(previousEnd, 'yyyy-MM-dd');

    Promise.all([
      fetchRevenueReport(startDateStr, endDateStr, barberFilter),
      fetchBookingsReport(startDateStr, endDateStr, barberFilter),
      fetchServicesReport(startDateStr, endDateStr, barberFilter),
      isOwnerOrAdmin ? fetchPerformanceReport(startDateStr, endDateStr) : Promise.resolve(),
      fetchComparisonReport(startDateStr, endDateStr, previousStartStr, previousEndStr, barberFilter),
      fetchCancellationReport(startDateStr, endDateStr, barberFilter),
      isOwnerOrAdmin ? fetchOccupancyReport(startDateStr, endDateStr, barberFilter) : Promise.resolve(),
      fetchTopClientsReport(startDateStr, endDateStr),
      isOwnerOrAdmin ? fetchAuditTimeline(startDateStr, endDateStr) : Promise.resolve(),
    ]);
  };

  const fetchRevenueReport = async (start: string, end: string, barberFilter: string | null) => {
    setLoadingRevenue(true);
    try {
      const { data, error } = await supabase.rpc('get_revenue_report', {
        p_start_date: start,
        p_end_date: end,
        p_barber_filter: barberFilter,
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setRevenueData({
          total_revenue: Number(data[0].total_revenue) || 0,
          total_bookings: Number(data[0].total_bookings) || 0,
          average_ticket: Number(data[0].average_ticket) || 0,
        });
      } else {
        setRevenueData({ total_revenue: 0, total_bookings: 0, average_ticket: 0 });
      }
    } catch (error: any) {
      console.error('Erro no relatório de receita:', error);
      toast({
        title: 'Erro ao carregar faturamento',
        description: error.message,
        variant: 'destructive',
      });
      setRevenueData({ total_revenue: 0, total_bookings: 0, average_ticket: 0 });
    } finally {
      setLoadingRevenue(false);
    }
  };

  const fetchBookingsReport = async (start: string, end: string, barberFilter: string | null) => {
    setLoadingBookings(true);
    try {
      const { data, error } = await supabase.rpc('get_bookings_report', {
        p_start_date: start,
        p_end_date: end,
        p_barber_filter: barberFilter,
      });

      if (error) throw error;
      setBookingsData(data || []);
    } catch (error: any) {
      console.error('Erro no relatório de agendamentos:', error);
      setBookingsData([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchServicesReport = async (start: string, end: string, barberFilter: string | null) => {
    setLoadingServices(true);
    try {
      const { data, error } = await supabase.rpc('get_top_services_report', {
        p_start_date: start,
        p_end_date: end,
        p_barber_filter: barberFilter,
      });

      if (error) throw error;
      setServicesData(data || []);
    } catch (error: any) {
      console.error('Erro no relatório de serviços:', error);
      setServicesData([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchPerformanceReport = async (start: string, end: string) => {
    setLoadingPerformance(true);
    try {
      const { data, error } = await supabase.rpc('get_barber_performance_report', {
        p_start_date: start,
        p_end_date: end,
      });

      if (error) throw error;
      setPerformanceData(data || []);
    } catch (error: any) {
      console.error('Erro no relatório de performance:', error);
      setPerformanceData([]);
    } finally {
      setLoadingPerformance(false);
    }
  };

  const fetchComparisonReport = async (
    currentStart: string, 
    currentEnd: string, 
    previousStart: string, 
    previousEnd: string,
    barberFilter: string | null
  ) => {
    setLoadingComparison(true);
    try {
      const { data, error } = await supabase.rpc('get_monthly_comparison_report', {
        p_current_start_date: currentStart,
        p_current_end_date: currentEnd,
        p_previous_start_date: previousStart,
        p_previous_end_date: previousEnd,
        p_barber_filter: barberFilter,
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setComparisonData(data[0]);
      } else {
        setComparisonData(null);
      }
    } catch (error: any) {
      console.error('Erro no relatório comparativo:', error);
      setComparisonData(null);
    } finally {
      setLoadingComparison(false);
    }
  };

  const fetchCancellationReport = async (start: string, end: string, barberFilter: string | null) => {
    setLoadingCancellation(true);
    try {
      const { data, error } = await supabase.rpc('get_cancellation_noshow_report', {
        p_start_date: start,
        p_end_date: end,
        p_barber_filter: barberFilter,
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setCancellationData(data[0]);
      } else {
        setCancellationData(null);
      }
    } catch (error: any) {
      console.error('Erro no relatório de cancelamentos:', error);
      setCancellationData(null);
    } finally {
      setLoadingCancellation(false);
    }
  };

  const fetchOccupancyReport = async (start: string, end: string, barberFilter: string | null) => {
    setLoadingOccupancy(true);
    try {
      const { data, error } = await supabase.rpc('get_schedule_occupancy_report', {
        p_start_date: start,
        p_end_date: end,
        p_barber_filter: barberFilter,
      });

      if (error) throw error;
      setOccupancyData(data || []);
    } catch (error: any) {
      console.error('Erro no relatório de ocupação:', error);
      setOccupancyData([]);
    } finally {
      setLoadingOccupancy(false);
    }
  };

  const fetchTopClientsReport = async (start: string, end: string) => {
    setLoadingTopClients(true);
    try {
      const { data, error } = await supabase.rpc('get_top_clients_and_profitable_hours', {
        p_start_date: start,
        p_end_date: end,
        p_limit: 10,
      });

      if (error) throw error;
      setTopClientsData(data || []);
    } catch (error: any) {
      console.error('Erro no relatório de top clientes:', error);
      setTopClientsData([]);
    } finally {
      setLoadingTopClients(false);
    }
  };

  const fetchAuditTimeline = async (start: string, end: string) => {
    setLoadingAudit(true);
    try {
      const { data, error } = await supabase.rpc('get_audit_timeline', {
        p_start_date: start,
        p_end_date: end,
        p_booking_id: null,
      });

      if (error) throw error;
      setAuditData(data || []);
    } catch (error: any) {
      console.error('Erro no relatório de auditoria:', error);
      setAuditData([]);
    } finally {
      setLoadingAudit(false);
    }
  };

  const currentPeriodLabel = format(startDate, 'MMM', { locale: ptBR });
  const previousPeriodLabel = format(subMonths(startDate, 1), 'MMM', { locale: ptBR });
  const monthLabel = format(currentMonth, "MMM yyyy", { locale: ptBR });

  return (
    <div className="space-y-0">
      {/* Booksy-style Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          Estatísticas e relatórios
        </h1>
        <div className="flex items-center gap-2">
          {/* Barber filter */}
          {isOwnerOrAdmin && (
            <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
              <SelectTrigger className="w-[160px] h-10 bg-card border-border">
                <SelectValue placeholder="Filtrar barbeiro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {barbers.map((barber) => (
                  <SelectItem key={barber.id} value={barber.id}>
                    {barber.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {isOwnerOrAdmin && (
            <ExportReportsButton startDate={startDate} endDate={endDate} />
          )}

          {/* Month Navigator */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousMonth}
              className="h-10 w-10 rounded-full border border-border hover:bg-accent"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-base font-semibold capitalize min-w-[100px] text-center">
              {monthLabel}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextMonth}
              className="h-10 w-10 rounded-full border border-border hover:bg-accent"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {isOwnerOrAdmin ? (
        <Tabs defaultValue="overview" className="space-y-0">
          <TabsList className="bg-transparent border-b border-border rounded-none h-auto p-0 gap-0 w-full justify-start">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              Painel
            </TabsTrigger>
            <TabsTrigger 
              value="bookings" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              Agendamentos
            </TabsTrigger>
            <TabsTrigger 
              value="clients" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              Clientes
            </TabsTrigger>
            <TabsTrigger 
              value="revenue" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              Receita
            </TabsTrigger>
            <TabsTrigger 
              value="team" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              Equipe
            </TabsTrigger>
            <TabsTrigger 
              value="audit" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              Auditoria
            </TabsTrigger>
          </TabsList>

          {/* PAINEL (Overview) Tab */}
          <TabsContent value="overview" className="pt-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Main Content - Left */}
              <div className="flex-1 min-w-0 space-y-8">
                {/* Bookings Chart */}
                <BookingsChart data={bookingsData} loading={loadingBookings} />

                {/* Revenue summary inline */}
                <RevenueCard data={revenueData} loading={loadingRevenue} />

                {/* Monthly Comparison */}
                <MonthlyComparisonCard 
                  data={comparisonData} 
                  loading={loadingComparison}
                  currentPeriod={currentPeriodLabel}
                  previousPeriod={previousPeriodLabel}
                />
              </div>

              {/* Sidebar - Right */}
              <ReportsSidebar
                revenueData={revenueData}
                cancellationData={cancellationData}
                comparisonData={comparisonData}
                loadingRevenue={loadingRevenue}
                loadingCancellation={loadingCancellation}
                loadingComparison={loadingComparison}
              />
            </div>
          </TabsContent>

          {/* AGENDAMENTOS Tab */}
          <TabsContent value="bookings" className="pt-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0 space-y-8">
                <BookingsChart data={bookingsData} loading={loadingBookings} />

                {/* Status Breakdown */}
                <CancellationRatesCard data={cancellationData} loading={loadingCancellation} />

                {/* Top Services */}
                <TopServicesTable data={servicesData} loading={loadingServices} />
              </div>

              {/* Sidebar */}
              <div className="w-full lg:w-[300px] flex-shrink-0">
                <div className="border border-border rounded-xl p-5 space-y-1 sticky top-4">
                  <h3 className="text-base font-semibold text-foreground mb-4">Relatórios</h3>
                  {[
                    'Resumo de visitas',
                    'Resumo de serviços',
                    'Lista de agendamentos',
                    'Agendamentos por serviço',
                    'Agendamentos por funcionário',
                    'Agendamentos por dias e horários',
                    'Cancelados',
                    'Não comparecimentos',
                  ].map((label) => (
                    <button
                      key={label}
                      className="w-full flex items-center justify-between py-3 px-1 text-sm text-foreground hover:text-primary transition-colors border-b border-border last:border-0"
                    >
                      {label}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* CLIENTES Tab */}
          <TabsContent value="clients" className="pt-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0 space-y-8">
                <TopClientsCard data={topClientsData} loading={loadingTopClients} />
              </div>

              <div className="w-full lg:w-[300px] flex-shrink-0">
                <div className="border border-border rounded-xl p-5 space-y-1 sticky top-4">
                  <h3 className="text-base font-semibold text-foreground mb-4">Relatórios</h3>
                  {[
                    'Resumo de clientes',
                    'Lista de clientes',
                    'Novos clientes',
                    'Clientes recorrentes',
                    'Clientes não fidelizados',
                  ].map((label) => (
                    <button
                      key={label}
                      className="w-full flex items-center justify-between py-3 px-1 text-sm text-foreground hover:text-primary transition-colors border-b border-border last:border-0"
                    >
                      {label}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* RECEITA Tab */}
          <TabsContent value="revenue" className="pt-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0 space-y-8">
                <RevenueCard data={revenueData} loading={loadingRevenue} />
                <MonthlyComparisonCard 
                  data={comparisonData} 
                  loading={loadingComparison}
                  currentPeriod={currentPeriodLabel}
                  previousPeriod={previousPeriodLabel}
                />
              </div>

              <ReportsSidebar
                revenueData={revenueData}
                cancellationData={cancellationData}
                comparisonData={comparisonData}
                loadingRevenue={loadingRevenue}
                loadingCancellation={loadingCancellation}
                loadingComparison={loadingComparison}
                variant="revenue"
              />
            </div>
          </TabsContent>

          {/* EQUIPE Tab */}
          <TabsContent value="team" className="pt-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0 space-y-8">
                <BarberPerformanceTable data={performanceData} loading={loadingPerformance} />
                <OccupancyTable data={occupancyData} loading={loadingOccupancy} />
              </div>
            </div>
          </TabsContent>

          {/* AUDITORIA Tab */}
          <TabsContent value="audit" className="pt-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0 space-y-8">
                <AuditTimelineCard data={auditData} loading={loadingAudit} />
              </div>
              <div className="w-full lg:w-[300px] flex-shrink-0">
                <AlertsCard />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        // Barber view - simplified with same layout style
        <Tabs defaultValue="overview" className="space-y-0">
          <TabsList className="bg-transparent border-b border-border rounded-none h-auto p-0 gap-0 w-full justify-start">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              Painel
            </TabsTrigger>
            <TabsTrigger 
              value="bookings" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              Agendamentos
            </TabsTrigger>
            <TabsTrigger 
              value="clients" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              Clientes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="pt-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0 space-y-8">
                <BookingsChart data={bookingsData} loading={loadingBookings} />
                <RevenueCard data={revenueData} loading={loadingRevenue} />
                <MonthlyComparisonCard 
                  data={comparisonData} 
                  loading={loadingComparison}
                  currentPeriod={currentPeriodLabel}
                  previousPeriod={previousPeriodLabel}
                />
              </div>
              <ReportsSidebar
                revenueData={revenueData}
                cancellationData={cancellationData}
                comparisonData={comparisonData}
                loadingRevenue={loadingRevenue}
                loadingCancellation={loadingCancellation}
                loadingComparison={loadingComparison}
              />
            </div>
          </TabsContent>

          <TabsContent value="bookings" className="pt-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0 space-y-8">
                <BookingsChart data={bookingsData} loading={loadingBookings} />
                <CancellationRatesCard data={cancellationData} loading={loadingCancellation} />
                <TopServicesTable data={servicesData} loading={loadingServices} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="clients" className="pt-6">
            <div className="flex-1 min-w-0 space-y-8">
              <TopClientsCard data={topClientsData} loading={loadingTopClients} />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
