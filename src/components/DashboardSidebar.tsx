import { CalendarDays, BarChart3, FolderOpen, Scissors, UserRound, Settings, Store, CreditCard, LucideIcon, Users, ShoppingBag, Megaphone, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DashboardSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

interface MenuItem {
  id: string;
  title: string;
  icon: LucideIcon;
  children?: MenuItem[];
  href?: string;
}

const menuStructure: MenuItem[] = [
  { id: 'bookings', title: 'Agenda', icon: CalendarDays },
  { id: 'reports', title: 'Relatórios', icon: BarChart3 },
  { id: 'services', title: 'Serviços', icon: Scissors },
  { id: 'barbers', title: 'Barbeiros', icon: UserRound },
  { id: 'edit', title: 'Editar Barbearia', icon: Store },
  { id: 'assinatura', title: 'Assinatura', icon: CreditCard },
];

export function DashboardSidebar({ currentTab, onTabChange }: DashboardSidebarProps) {
  const navigate = useNavigate();

  return (
    <TooltipProvider delayDuration={0}>
      <div className="hidden lg:flex flex-col items-center w-14 border-r border-border bg-background py-4 gap-1">
        {menuStructure.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (item.href) {
                      navigate(item.href);
                    } else {
                      onTabChange(item.id);
                    }
                  }}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {item.title}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Settings at bottom */}
        <div className="mt-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => navigate('/perfil?tab=security')}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
                  'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Settings className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Configurações
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
