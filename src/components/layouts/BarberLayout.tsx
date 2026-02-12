import { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { BarberSidebar } from '@/components/BarberSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

interface BarberLayoutProps {
  children: ReactNode;
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const BarberLayout = ({ children, currentTab, onTabChange }: BarberLayoutProps) => {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Header />
      <SidebarProvider>
        <div className="flex flex-1 w-full mt-16 min-h-0">
          <BarberSidebar currentTab={currentTab} onTabChange={onTabChange} />
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
};
