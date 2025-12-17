import { Calendar, CalendarDays, X } from 'lucide-react';
import barber360Logo from '@/assets/barber360-logo.png';
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
];

export function BarberSidebar({ currentTab, onTabChange }: BarberSidebarProps) {
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  
  useEffect(() => {
    if (!isMobile) {
      setOpen(true);
    }
  }, [isMobile, setOpen]);

  return (
    <Sidebar className="border-r w-64" collapsible="none">
      <SidebarHeader className="border-b p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <img src={barber360Logo} alt="Barber360" className="h-8 w-8 flex-shrink-0" />
            <h2 className="text-lg font-semibold truncate">Barber360</h2>
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
                    className="w-full hover:bg-muted/50 transition-colors"
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
