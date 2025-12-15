import { ReactNode, useState } from 'react';
import { Header } from '@/components/Header';
import { AdminSidebar } from '@/components/AdminSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

interface AdminLayoutProps {
  children: ReactNode;
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const AdminLayout = ({ children, currentTab, onTabChange }: AdminLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SidebarProvider>
        <div className="flex min-h-screen w-full mt-16">
          <AdminSidebar currentTab={currentTab} onTabChange={onTabChange} />
          <main className="flex-1 flex flex-col w-full min-h-screen">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
};
