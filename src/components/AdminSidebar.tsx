import { Edit, CalendarDays, Scissors, Users, X, ChevronRight, Settings, ClipboardList } from 'lucide-react';
import b360Logo from '@/assets/b360-logo.png';
import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AdminSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

interface MenuItem {
  id: string;
  title: string;
  icon: any;
  children?: MenuItem[];
}

const menuStructure: MenuItem[] = [
  { id: 'bookings', title: 'Agenda', icon: CalendarDays },
  {
    id: 'cadastros',
    title: 'Cadastros',
    icon: ClipboardList,
    children: [
      { id: 'services', title: 'Serviços', icon: Scissors },
      { id: 'barbers', title: 'Barbeiros', icon: Users },
    ],
  },
  {
    id: 'configuracoes',
    title: 'Configurações',
    icon: Settings,
    children: [
      { id: 'edit', title: 'Editar Barbearia', icon: Edit },
    ],
  },
];

export function AdminSidebar({ currentTab, onTabChange }: AdminSidebarProps) {
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  
  useEffect(() => {
    if (!isMobile) {
      setOpen(true);
    }
  }, [isMobile, setOpen]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

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
            <X className="h-4 w-4" strokeWidth={1.5} />
            <span className="text-xs">Fechar</span>
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroupContent>
          <SidebarMenu>
            {menuStructure.map((item) => {
              if (!item.children || item.children.length === 0) {
                return (
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
                        <item.icon className="h-4 w-4" strokeWidth={1.5} />
                        <span>{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              }

              return (
                <Collapsible
                  key={item.id}
                  open={openGroups.includes(item.id)}
                  onOpenChange={() => toggleGroup(item.id)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title}>
                        <item.icon className="h-4 w-4" strokeWidth={1.5} />
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" strokeWidth={1.5} />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.children.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.id}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={currentTab === subItem.id}
                            >
                              <button
                                className="w-full hover:bg-gray-100 transition-colors text-gray-900"
                                onClick={() => {
                                  onTabChange(subItem.id);
                                  if (isMobile) setOpenMobile(false);
                                }}
                              >
                                <subItem.icon className="h-4 w-4" strokeWidth={1.5} />
                                <span>{subItem.title}</span>
                              </button>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarContent>
    </Sidebar>
  );
}
