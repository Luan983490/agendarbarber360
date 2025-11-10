import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAccess } from '@/hooks/useUserAccess';
import { Header } from '@/components/Header';
import { ScheduleManagement } from '@/components/ScheduleManagement';
import BookingsManagement from '@/components/BookingsManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, List } from 'lucide-react';

export default function AttendantDashboard() {
  const access = useUserAccess();
  const navigate = useNavigate();

  useEffect(() => {
    if (!access.loading && access.role !== 'attendant') {
      navigate('/');
    }
  }, [access.loading, access.role, navigate]);

  if (access.loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center items-center h-96">
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (access.role !== 'attendant' || !access.barbershopId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 mt-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Painel do Atendente</h1>
          <p className="text-muted-foreground">
            Gerencie agendamentos e visualize a agenda da barbearia
          </p>
        </div>

        <Tabs defaultValue="schedule" className="space-y-4">
          <TabsList>
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="h-4 w-4" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="bookings" className="gap-2">
              <List className="h-4 w-4" />
              Lista de Agendamentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule">
            <ScheduleManagement barbershopId={access.barbershopId} />
          </TabsContent>

          <TabsContent value="bookings">
            <BookingsManagement barbershopId={access.barbershopId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
