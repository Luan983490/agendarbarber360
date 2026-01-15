import { X, ChevronRight } from 'lucide-react';
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
  children?: MenuItem[];
}

// ============================================
// 🚀 MENU PRINCIPAL - MVP v1.0
// ============================================
const menuStructure: MenuItem[] = [
  { id: 'bookings', title: 'Agenda' },
  { id: 'reports', title: 'Relatórios' },
  {
    id: 'cadastros',
    title: 'Cadastros',
    children: [
      { id: 'services', title: 'Serviços' },
      { id: 'barbers', title: 'Barbeiros' },
    ],
  },
  {
    id: 'configuracoes',
    title: 'Configurações',
    children: [
      { id: 'edit', title: 'Editar Barbearia' },
    ],
  },
];

// ============================================
// 🚀 FEATURES v2.0 - REATIVAR APÓS VALIDAÇÃO
// ============================================
// Features removidas para simplificar MVP
// Critério reativação: 10+ barbearias ativas
// Data: 15/12/2024
// ============================================

// [MVP v1.0] Removido temporariamente - Reativar na v2.0
// Motivo: Simplificação para validação do core
// { id: 'products', title: 'Produtos', icon: ShoppingBag },
// { id: 'packages', title: 'Pacotes', icon: Package },
// { id: 'subscriptions', title: 'Assinaturas', icon: CreditCard },
// { id: 'loyalty', title: 'Fidelidade', icon: Gift },
// { id: 'staff', title: 'Funcionários', icon: Users },

// [MVP v1.0] Menus completos removidos - Reativar na v2.0
// {
//   id: 'comandas',
//   title: 'Comandas',
//   icon: Calendar,
//   children: [
//     { id: 'schedule', title: 'Lista de Agendamentos', icon: Calendar },
//   ],
// },
// {
//   id: 'financeiro',
//   title: 'Financeiro',
//   icon: DollarSign,
//   children: [],
// },
// {
//   id: 'relatorios',
//   title: 'Relatórios',
//   icon: BarChart3,
//   children: [],
// },

export function DashboardSidebar({ currentTab, onTabChange }: DashboardSidebarProps) {
  const { setOpenMobile, isMobile } = useSidebar();
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  return (
    <Sidebar 
      className="border-r w-56 lg:w-64 shrink-0" 
      collapsible="offcanvas"
      style={{ backgroundColor: '#615e5e' }}
    >
      <SidebarHeader className="border-b border-[#4a4848] p-2 sm:p-3 lg:p-4" style={{ backgroundColor: '#615e5e' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <h2 className="text-sm sm:text-base lg:text-lg font-semibold truncate" style={{ color: '#d9d9d9' }}>Dashboard</h2>
          </div>
          <Button
            variant="ghost" 
            size="sm"
            className="lg:hidden gap-1 flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 p-0 text-[#d9d9d9] hover:bg-[#4a4848]"
            onClick={() => setOpenMobile(false)}
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-4" style={{ backgroundColor: '#615e5e' }}>
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
                          className="w-full hover:bg-[#4a4848] transition-colors"
                          style={{ color: '#d9d9d9' }}
                          onClick={() => {
                            onTabChange(item.id);
                            if (isMobile) {
                              setOpenMobile(false);
                            }
                          }}
                        >
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
                        <SidebarMenuButton tooltip={item.title} className="hover:bg-[#4a4848]" style={{ color: '#d9d9d9' }}>
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
                                  className="w-full hover:bg-[#4a4848] transition-colors"
                                  style={{ color: '#d9d9d9' }}
                                  onClick={() => {
                                    onTabChange(subItem.id);
                                    if (isMobile) {
                                      setOpenMobile(false);
                                    }
                                  }}
                                >
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
