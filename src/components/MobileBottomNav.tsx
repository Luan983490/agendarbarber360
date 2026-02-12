import { CalendarDays, Users, ShoppingBag, Megaphone, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'bookings', label: 'Agendamentos', icon: CalendarDays },
  { id: 'barbers', label: 'Barbeiros', icon: Users },
  { id: 'services', label: 'Serviços', icon: ShoppingBag },
  { id: 'reports', label: 'Relatórios', icon: Megaphone },
  { id: 'edit', label: 'Perfil', icon: User },
];

export function MobileBottomNav({ currentTab, onTabChange }: MobileBottomNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
