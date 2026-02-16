import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, CalendarDays, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { id: 'home', label: 'Início', icon: Home, path: '/' },
  { id: 'search', label: 'Buscar', icon: Search, path: '/' },
  { id: 'bookings', label: 'Agendamentos', icon: CalendarDays, path: '/my-bookings' },
  { id: 'profile', label: 'Perfil', icon: UserRound, path: '/perfil' },
];

export function ClientBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (item: typeof navItems[0]) => {
    if (item.id === 'bookings') return location.pathname === '/my-bookings' || location.pathname === '/historico';
    if (item.id === 'profile') return location.pathname === '/perfil';
    if (item.id === 'home') return location.pathname === '/' && item.id === 'home';
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-[#3a3939]" style={{ backgroundColor: '#1a1a1a' }}>
      <div className="flex items-center justify-around py-1.5 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 rounded-md transition-colors min-w-0 flex-1',
                active ? 'text-primary' : 'text-[#888888] hover:text-[#bbbbbb]'
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
      <div className="h-[env(safe-area-inset-bottom)]" style={{ backgroundColor: '#1a1a1a' }} />
    </nav>
  );
}
