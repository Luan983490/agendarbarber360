import { Store, Edit, CalendarDays, Calendar, Scissors, Users, Package, X } from 'lucide-react';
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
  { id: 'products', title: 'Produtos', icon: Package },
];

export function DashboardSidebar({ currentTab, onTabChange }: DashboardSidebarProps) {
  const { open, setOpen } = useSidebar();

  return (
    <Sidebar className="border-r" collapsible="offcanvas">
      <SidebarHeader className="border-b p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Menu Dashboard</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="lg:hidden gap-1"
            onClick={() => setOpen(false)}
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
                  >
                    <button 
                      className="w-full hover:bg-muted/50"
                      onClick={() => {
                        onTabChange(item.id);
                        // Fecha o menu em mobile após selecionar
                        if (window.innerWidth < 1024) {
                          setOpen(false);
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
