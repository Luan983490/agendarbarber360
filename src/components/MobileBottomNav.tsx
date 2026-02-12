import { CalendarDays, Scissors, UserRound, BarChart3, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'bookings', label: 'Agenda', icon: CalendarDays },
  { id: 'barbers', label: 'Barbeiros', icon: UserRound },
  { id: 'services', label: 'Serviços', icon: Scissors },
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'edit', label: 'Barbearia', icon: Store },
];

export function MobileBottomNav({ currentTab, onTabChange }: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-[#3a3939]" style={{ backgroundColor: '#1a1a1a' }}>
      <div className="flex items-center justify-around py-1.5 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-colors min-w-0 flex-1',
                isActive
                  ? 'text-white'
                  : 'text-[#888888] hover:text-[#bbbbbb]'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-[10px] leading-tight truncate w-full text-center">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Safe area for devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" style={{ backgroundColor: '#1a1a1a' }} />
    </nav>
  );
}
