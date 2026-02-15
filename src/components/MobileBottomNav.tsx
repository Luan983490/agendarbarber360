import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Scissors, UserRound, BarChart3, Store, CreditCard, ChevronUp, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface MobileBottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const mainNavItems = [
  { id: 'bookings', label: 'Agenda', icon: CalendarDays },
  { id: 'barbers', label: 'Barbeiros', icon: UserRound },
  { id: 'services', label: 'Serviços', icon: Scissors },
  { id: 'clients', label: 'Clientes', icon: Users },
];

const barbershopSubItems = [
  { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  { id: 'edit', label: 'Editar Barbearia', icon: Settings },
  { id: 'assinatura', label: 'Assinatura', icon: CreditCard, href: '/admin/assinatura' },
];

export function MobileBottomNav({ currentTab, onTabChange }: MobileBottomNavProps) {
  const [subMenuOpen, setSubMenuOpen] = useState(false);
  const navigate = useNavigate();

  const isBarbershopActive = barbershopSubItems.some(item => currentTab === item.id);

  const handleSubItemClick = (item: typeof barbershopSubItems[0]) => {
    if (item.href) {
      navigate(item.href);
    } else {
      onTabChange(item.id);
    }
    setSubMenuOpen(false);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-[#3a3939]" style={{ backgroundColor: '#1a1a1a' }}>
      <div className="flex items-center justify-around py-1.5 px-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-colors min-w-0 flex-1',
                isActive ? 'text-white' : 'text-[#888888] hover:text-[#bbbbbb]'
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-[10px] leading-tight truncate w-full text-center">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Barbearia with submenu */}
        <Popover open={subMenuOpen} onOpenChange={setSubMenuOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-colors min-w-0 flex-1',
                isBarbershopActive ? 'text-white' : 'text-[#888888] hover:text-[#bbbbbb]'
              )}
            >
              <Store className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-[10px] leading-tight truncate w-full text-center">
                Barbearia
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            sideOffset={8}
            className="w-48 p-1 border-[#3a3939]"
            style={{ backgroundColor: '#1a1a1a' }}
          >
            {barbershopSubItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSubItemClick(item)}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-2.5 rounded-md text-sm transition-colors',
                    isActive ? 'text-white bg-[#333]' : 'text-[#aaa] hover:text-white hover:bg-[#2a2a2a]'
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </PopoverContent>
        </Popover>
      </div>
      {/* Safe area for devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" style={{ backgroundColor: '#1a1a1a' }} />
    </nav>
  );
}
