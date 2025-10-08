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
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
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
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={onCreateBooking}>
          <Calendar className="mr-2 h-4 w-4" />
          Criar Agendamento
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onBlockTime}>
          <Ban className="mr-2 h-4 w-4" />
          Bloquear Horário
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
