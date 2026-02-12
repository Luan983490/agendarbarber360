import { CalendarDays, BarChart3, Scissors, UserRound, Settings, Store, CreditCard, LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface DashboardSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

interface MenuItem {
  id: string;
  title: string;
  icon: LucideIcon;
  href?: string;
  separator?: boolean;
}

const menuItems: MenuItem[] = [
  { id: 'bookings', title: 'Agenda', icon: CalendarDays },
  { id: 'barbers', title: 'Barbeiros', icon: UserRound },
  { id: 'services', title: 'Serviços', icon: Scissors },
  { id: 'reports', title: 'Relatórios', icon: BarChart3, separator: true },
  { id: 'edit', title: 'Editar Barbearia', icon: Store },
  { id: 'assinatura', title: 'Assinatura', icon: CreditCard, href: '/admin/assinatura' },
  { id: 'settings', title: 'Configurações', icon: Settings },
];

export function DashboardSidebar({ currentTab, onTabChange }: DashboardSidebarProps) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();

  const handleClick = (item: MenuItem) => {
    if (item.href) {
      navigate(item.href);
    } else {
      onTabChange(item.id);
    }
  };

  return (
    <Sidebar
      className="w-14 shrink-0 border-r border-[#3a3939]"
      collapsible="none"
      style={{ backgroundColor: '#1a1a1a' }}
    >
      <SidebarContent className="py-3" style={{ backgroundColor: '#1a1a1a' }}>
        <TooltipProvider delayDuration={100}>
          <SidebarMenu className="gap-1 px-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <div key={item.id}>
                  {item.separator && index > 0 && (
                    <Separator className="my-2 bg-[#3a3939]" />
                  )}
                  <SidebarMenuItem>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <button
                            onClick={() => handleClick(item)}
                            className={cn(
                              'flex items-center justify-center w-10 h-10 rounded-md transition-colors',
                              isActive
                                ? 'bg-[#333] text-white'
                                : 'text-[#888] hover:text-white hover:bg-[#2a2a2a]'
                            )}
                          >
                            <Icon className="h-5 w-5" strokeWidth={1.5} />
                          </button>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                </div>
              );
            })}
          </SidebarMenu>
        </TooltipProvider>
      </SidebarContent>
    </Sidebar>
  );
}
