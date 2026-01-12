import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, Ban } from 'lucide-react';

interface SlotActionMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: { x: number; y: number };
  onCreateBooking: () => void;
  onBlockTime: () => void;
}

export const SlotActionMenu = ({
  open,
  onOpenChange,
  position,
  onCreateBooking,
  onBlockTime,
}: SlotActionMenuProps) => {
  // Previne que cliques múltiplos abram vários menus
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange} modal={false}>
      <DropdownMenuTrigger asChild>
        <div
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            width: 1,
            height: 1,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={5}>
        <DropdownMenuItem onClick={onCreateBooking}>
          <Calendar className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Criar Agendamento
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onBlockTime}>
          <Ban className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Bloquear Horário
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
