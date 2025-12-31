import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useUserAccess } from '@/hooks/useUserAccess';
import { useToast } from '@/hooks/use-toast';
import { RevenueCard } from './RevenueCard';
import { TopServicesTable } from './TopServicesTable';
import { BarberPerformanceTable } from './BarberPerformanceTable';
import { BookingsChart } from './BookingsChart';
import { DateRangeFilter } from './DateRangeFilter';
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
  
  // Loading states
  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingPerformance, setLoadingPerformance] = useState(true);

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

    // Fetch all reports in parallel
    Promise.all([
      fetchRevenueReport(startDateStr, endDateStr, barberFilter),
      fetchBookingsReport(startDateStr, endDateStr, barberFilter),
      fetchServicesReport(startDateStr, endDateStr, barberFilter),
      isOwnerOrAdmin ? fetchPerformanceReport(startDateStr, endDateStr) : Promise.resolve(),
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

  const handleDateChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

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

      {/* Charts and Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BookingsChart data={bookingsData} loading={loadingBookings} />
        <TopServicesTable data={servicesData} loading={loadingServices} />
      </div>

      {/* Barber Performance - only for owner/admin */}
      {isOwnerOrAdmin && (
        <BarberPerformanceTable data={performanceData} loading={loadingPerformance} />
      )}
    </div>
  );
}
