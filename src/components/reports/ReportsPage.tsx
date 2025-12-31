import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useUserAccess } from '@/hooks/useUserAccess';
import { useToast } from '@/hooks/use-toast';
import { RevenueCard } from './RevenueCard';
import { TopServicesTable } from './TopServicesTable';
import { BarberPerformanceTable } from './BarberPerformanceTable';
import { BookingsChart } from './BookingsChart';
import { DateRangeFilter } from './DateRangeFilter';
import { MonthlyComparisonCard } from './MonthlyComparisonCard';
import { CancellationRatesCard } from './CancellationRatesCard';
import { OccupancyTable } from './OccupancyTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3 } from 'lucide-react';

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

export function ReportsPage({ barbershopId }: ReportsPageProps) {
  const { role, barberId } = useUserAccess();
  const { toast } = useToast();
  const isOwnerOrAdmin = role === 'owner';
  
  // Date range
  const [startDate, setStartDate] = useState<Date>(() => startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(() => endOfMonth(new Date()));
  
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
  
  // Loading states
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingPerformance, setLoadingPerformance] = useState(true);
  const [loadingComparison, setLoadingComparison] = useState(true);
  const [loadingCancellation, setLoadingCancellation] = useState(true);
  const [loadingOccupancy, setLoadingOccupancy] = useState(true);

  // Fetch barbers for filter (owner/admin only)
  useEffect(() => {
    if (isOwnerOrAdmin) {
      fetchBarbers();
    }
  }, [isOwnerOrAdmin, barbershopId]);

  // Fetch reports when filters change
  useEffect(() => {
    fetchReports();
  }, [startDate, endDate, selectedBarberId, role, barberId]);

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
    
    // Calculate previous period for comparison
    const monthsDiff = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));
    const previousStart = subMonths(startDate, monthsDiff);
    const previousEnd = subMonths(endDate, monthsDiff);
    const previousStartStr = format(previousStart, 'yyyy-MM-dd');
    const previousEndStr = format(previousEnd, 'yyyy-MM-dd');

    // Fetch all reports in parallel
    Promise.all([
      fetchRevenueReport(startDateStr, endDateStr, barberFilter),
      fetchBookingsReport(startDateStr, endDateStr, barberFilter),
      fetchServicesReport(startDateStr, endDateStr, barberFilter),
      isOwnerOrAdmin ? fetchPerformanceReport(startDateStr, endDateStr) : Promise.resolve(),
      fetchComparisonReport(startDateStr, endDateStr, previousStartStr, previousEndStr, barberFilter),
      fetchCancellationReport(startDateStr, endDateStr, barberFilter),
      isOwnerOrAdmin ? fetchOccupancyReport(startDateStr, endDateStr, barberFilter) : Promise.resolve(),
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

  const handleDateChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const currentPeriodLabel = format(startDate, 'MMM', { locale: ptBR });
  const previousPeriodLabel = format(subMonths(startDate, 1), 'MMM', { locale: ptBR });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold">Relatórios</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-lg border">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onDateChange={handleDateChange}
        />

        {/* Barber filter - only for owner/admin */}
        {isOwnerOrAdmin && (
          <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar barbeiro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Barbeiros</SelectItem>
              {barbers.map((barber) => (
                <SelectItem key={barber.id} value={barber.id}>
                  {barber.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Revenue Cards */}
      <RevenueCard data={revenueData} loading={loadingRevenue} />

      {/* Monthly Comparison */}
      <MonthlyComparisonCard 
        data={comparisonData} 
        loading={loadingComparison}
        currentPeriod={currentPeriodLabel}
        previousPeriod={previousPeriodLabel}
      />

      {/* Cancellation & No-Show Rates */}
      <CancellationRatesCard data={cancellationData} loading={loadingCancellation} />

      {/* Charts and Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BookingsChart data={bookingsData} loading={loadingBookings} />
        <TopServicesTable data={servicesData} loading={loadingServices} />
      </div>

      {/* Occupancy - only for owner/admin */}
      {isOwnerOrAdmin && (
        <OccupancyTable data={occupancyData} loading={loadingOccupancy} />
      )}

      {/* Barber Performance - only for owner/admin */}
      {isOwnerOrAdmin && (
        <BarberPerformanceTable data={performanceData} loading={loadingPerformance} />
      )}
    </div>
  );
}
