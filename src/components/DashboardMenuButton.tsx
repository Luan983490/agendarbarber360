import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';

export function DashboardMenuButton() {
  const { toggleSidebar } = useSidebar();

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="gap-2"
      onClick={toggleSidebar}
    >
      <Menu className="h-4 w-4" />
      <span className="hidden sm:inline">Menu</span>
    </Button>
  );
}
