import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { House, Search, CalendarRange, CircleUserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { id: 'home', label: 'Início', icon: House, path: '/', requiresAuth: false },
  { id: 'search', label: 'Buscar', icon: Search, path: '/', requiresAuth: false },
  { id: 'bookings', label: 'Agendamentos', icon: CalendarRange, path: '/my-bookings', requiresAuth: true },
  { id: 'profile', label: 'Perfil', icon: CircleUserRound, path: '/perfil', requiresAuth: true },
];

export function ClientBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lastClicked, setLastClicked] = useState<string | null>(() => {
    return sessionStorage.getItem('client-nav-last-clicked');
  });

  const isActive = (item: typeof navItems[0]) => {
    if (item.id === 'bookings') return location.pathname === '/my-bookings' || location.pathname === '/historico';
    if (item.id === 'profile') return location.pathname === '/perfil';
    // When redirected to /choose-type, highlight the item that was clicked
    if (location.pathname === '/choose-type') {
      return lastClicked === item.id;
    }
    if (location.pathname === '/') {
      if (lastClicked === 'search' && item.id === 'search') return true;
      if (lastClicked !== 'search' && item.id === 'home') return true;
      return false;
    }
    return false;
  };

  const handleClick = (item: typeof navItems[0]) => {
    setLastClicked(item.id);
    sessionStorage.setItem('client-nav-last-clicked', item.id);
    
    if (item.requiresAuth && !user) {
      navigate('/choose-type');
      return;
    }
    
    navigate(item.path);
    if (item.id === 'search') {
      setTimeout(() => {
        const input = document.getElementById('search-barbershop-input');
        if (input) input.focus();
      }, 100);
    }
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
              onClick={() => handleClick(item)}
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
