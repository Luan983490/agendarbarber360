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
    <div className="min-h-screen bg-background">
      <Header />
      <SidebarProvider>
        <div className="flex min-h-screen w-full mt-16">
          <BarberSidebar currentTab={currentTab} onTabChange={onTabChange} />
          <main className="flex-1 flex flex-col w-full min-h-screen">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
};
