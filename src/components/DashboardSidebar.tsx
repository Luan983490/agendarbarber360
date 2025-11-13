import { Store, Edit, CalendarDays, Calendar, Scissors, Users, Package, X, CreditCard, Gift, ShoppingBag, ChevronRight, DollarSign, BarChart3, Settings, ClipboardList } from 'lucide-react';
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface DashboardSidebarProps {
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
      { id: 'products', title: 'Produtos', icon: ShoppingBag },
      { id: 'packages', title: 'Pacotes', icon: Package },
      { id: 'subscriptions', title: 'Assinaturas', icon: CreditCard },
      { id: 'loyalty', title: 'Fidelidade', icon: Gift },
      { id: 'staff', title: 'Funcionários', icon: Users },
    ],
  },
  {
    id: 'comandas',
    title: 'Comandas',
    icon: Calendar,
    children: [
      { id: 'schedule', title: 'Lista de Agendamentos', icon: Calendar },
    ],
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    icon: DollarSign,
    children: [],
  },
  {
    id: 'relatorios',
    title: 'Relatórios',
    icon: BarChart3,
    children: [],
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

export function DashboardSidebar({ currentTab, onTabChange }: DashboardSidebarProps) {
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  
  // Manter sidebar sempre aberto
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
    <Sidebar 
      className="border-r w-64" 
      collapsible="none"
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
              {menuStructure.map((item) => {
                // Item sem filhos (link direto)
                if (!item.children || item.children.length === 0) {
                  return (
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
                  );
                }

                // Item com filhos (grupo expansível)
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
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
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
                                  className="w-full hover:bg-muted/50 transition-colors"
                                  onClick={() => {
                                    onTabChange(subItem.id);
                                    if (isMobile) {
                                      setOpenMobile(false);
                                    }
                                  }}
                                >
                                  <subItem.icon className="h-4 w-4" />
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
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
