import { Calendar, CalendarDays, BarChart3, X } from 'lucide-react';
import b360Logo from '@/assets/b360-logo.png';
import { useEffect } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

interface BarberSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

interface MenuItem {
  id: string;
  title: string;
  icon: any;
}

const menuStructure: MenuItem[] = [
  { id: 'hoje', title: 'Hoje', icon: Calendar },
  { id: 'agenda', title: 'Minha Agenda', icon: CalendarDays },
  { id: 'performance', title: 'Meu Desempenho', icon: BarChart3 },
];

export function BarberSidebar({ currentTab, onTabChange }: BarberSidebarProps) {
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  
  useEffect(() => {
    if (!isMobile) {
      setOpen(true);
    }
  }, [isMobile, setOpen]);

  return (
    <Sidebar className="border-r w-64 bg-white" collapsible="none">
      <SidebarHeader className="border-b p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <img src={b360Logo} alt="B360" className="h-10 flex-shrink-0" />
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
        <SidebarGroupContent>
          <SidebarMenu>
            {menuStructure.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  asChild
                  isActive={currentTab === item.id}
                  tooltip={item.title}
                >
                  <button
                    className="w-full hover:bg-gray-100 transition-colors text-gray-900"
                    onClick={() => {
                      onTabChange(item.id);
                      if (isMobile) setOpenMobile(false);
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
      </SidebarContent>
    </Sidebar>
  );
}
