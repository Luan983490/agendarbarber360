import { useState } from 'react';
import { useUserAccess } from '@/hooks/useUserAccess';
import { BarberLayout } from '@/components/layouts/BarberLayout';
import { BarberScheduleCalendar } from '@/components/BarberScheduleCalendar';
import b360Logo from '@/assets/b360-logo.png';
import { useNavigate } from 'react-router-dom';

export default function BarberAgenda() {
  const { barberId, barbershopId, loading: accessLoading } = useUserAccess();
  const [currentTab, setCurrentTab] = useState('agenda');
  const navigate = useNavigate();

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (tab === 'hoje') {
      navigate('/barber/hoje');
    } else if (tab === 'performance') {
      navigate('/barber/performance');
    }
  };

  if (accessLoading) {
    return (
      <BarberLayout currentTab={currentTab} onTabChange={handleTabChange}>
        <div className="flex-1 flex items-center justify-center">
          <img src={b360Logo} alt="B360" className="h-16 animate-pulse" />
        </div>
      </BarberLayout>
    );
  }

  return (
    <BarberLayout currentTab={currentTab} onTabChange={handleTabChange}>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {barbershopId && (
          <div className="flex-1 min-h-0 flex flex-col">
            <BarberScheduleCalendar 
              barbershopId={barbershopId} 
              barberIdFilter={barberId}
            />
          </div>
        )}
      </div>
    </BarberLayout>
  );
}
