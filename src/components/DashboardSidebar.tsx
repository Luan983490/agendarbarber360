import { Store, Edit, CalendarDays, Calendar, Scissors, Users, Package } from 'lucide-react';
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
} from '@/components/ui/sidebar';

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
  const { open: collapsed } = useSidebar();

  return (
    <Sidebar className={collapsed ? "w-60" : "w-14"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    asChild
                    isActive={currentTab === item.id}
                    onClick={() => onTabChange(item.id)}
                  >
                    <button className="w-full hover:bg-muted/50">
                      <item.icon className="h-4 w-4" />
                      {collapsed && <span>{item.title}</span>}
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
