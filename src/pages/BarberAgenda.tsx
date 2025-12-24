import { useState } from 'react';
import { useUserAccess } from '@/hooks/useUserAccess';
import { BarberLayout } from '@/components/layouts/BarberLayout';
import { BarberScheduleCalendar } from '@/components/BarberScheduleCalendar';
import { Scissors } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BarberAgenda() {
  const { barberId, barbershopId, loading: accessLoading } = useUserAccess();
  const [currentTab, setCurrentTab] = useState('agenda');
  const navigate = useNavigate();

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (tab === 'hoje') {
      navigate('/barber/hoje');
    }
  };

  if (accessLoading) {
    return (
      <BarberLayout currentTab={currentTab} onTabChange={handleTabChange}>
        <div className="flex-1 flex items-center justify-center">
          <Scissors className="h-8 w-8 animate-spin text-primary" />
        </div>
      </BarberLayout>
    );
  }

  return (
    <BarberLayout currentTab={currentTab} onTabChange={handleTabChange}>
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 lg:px-6">
        <h1 className="text-xl lg:text-2xl font-bold">Minha Agenda</h1>
        <p className="text-sm text-muted-foreground">
          Visualize seus agendamentos
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 h-full">
        {barbershopId && (
          <div className="h-full">
            <BarberScheduleCalendar 
              barbershopId={barbershopId} 
              barberIdFilter={barberId}
              readOnly={true}
            />
          </div>
        )}
      </div>
    </BarberLayout>
  );
}
