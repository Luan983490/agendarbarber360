import { Store, Edit, CalendarDays, Calendar, Scissors, Users, Package, X, CreditCard, Gift, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

interface DashboardSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'overview', title: 'Visão Geral', icon: Store },
  { id: 'edit', title: 'Editar', icon: Edit },
  { id: 'schedule', title: 'Agenda', icon: CalendarDays },
  { id: 'bookings', title: 'Lista', icon: Calendar },
  { id: 'services', title: 'Serviços', icon: Scissors },
  { id: 'barbers', title: 'Barbeiros', icon: Users },
  { id: 'products', title: 'Produtos', icon: ShoppingBag },
  { id: 'packages', title: 'Pacotes', icon: Package },
  { id: 'subscriptions', title: 'Assinaturas', icon: CreditCard },
  { id: 'loyalty', title: 'Fidelidade', icon: Gift },
];

export function DashboardSidebar({ currentTab, onTabChange }: DashboardSidebarProps) {
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const [isHovering, setIsHovering] = useState(false);
  const isOverview = currentTab === 'overview';
  
  // Controlar o estado do sidebar baseado na rota atual
  useEffect(() => {
    if (!isMobile) {
      // Desktop: aberto em overview, fechado nas outras
      setOpen(isOverview);
    }
  }, [currentTab, isOverview, isMobile, setOpen]);

  return (
    <Sidebar 
      className="border-r transition-all duration-300" 
      collapsible="icon"
      onMouseEnter={() => {
        // Só abrir no hover se não estiver em overview e não for mobile
        if (!isOverview && !isMobile) {
          setIsHovering(true);
          setOpen(true);
        }
      }}
      onMouseLeave={() => {
        // Só fechar se não estiver em overview e não for mobile
        if (!isOverview && !isMobile) {
          setIsHovering(false);
          setOpen(false);
        }
      }}
    >
      <SidebarHeader className="border-b p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Store className="h-5 w-5 text-primary flex-shrink-0" />
            <h2 className="text-lg font-semibold truncate">Dashboard</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="lg:hidden gap-1 flex-shrink-0"
            onClick={() => setOpenMobile(false)}
          >
            <X className="h-4 w-4" />
            <span className="text-xs">Fechar</span>
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    asChild
                    isActive={currentTab === item.id}
                    tooltip={item.title}
                  >
                    <button 
                      className="w-full hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        onTabChange(item.id);
                        // Fecha o menu em mobile após selecionar
                        if (isMobile) {
                          setOpenMobile(false);
                        }
                      }}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
