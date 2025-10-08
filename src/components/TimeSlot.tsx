import { cn } from '@/lib/utils';
import { Clock, User, Scissors, Ban, Info } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

interface TimeSlotProps {
  time: string;
  type: 'available' | 'booked' | 'blocked';
  booking?: {
    client_name: string;
    service_name: string;
    status: string;
  };
  block?: {
    reason: string | null;
  };
  onClick?: () => void;
}

export const TimeSlot = ({ time, type, booking, block, onClick }: TimeSlotProps) => {
  const getSlotStyles = () => {
    switch (type) {
      case 'available':
        return 'bg-success/10 hover:bg-success/20 border-success/30 cursor-pointer';
      case 'booked':
        return 'bg-primary/10 border-primary/30 cursor-pointer';
      case 'blocked':
        return 'bg-destructive/10 border-destructive/30 cursor-pointer';
      default:
        return 'bg-muted border-border';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'available':
        return <Clock className="h-3 w-3 text-success" />;
      case 'booked':
        return <User className="h-3 w-3 text-primary" />;
      case 'blocked':
        return <Ban className="h-3 w-3 text-destructive" />;
    }
  };

  const slotContent = (
    <div
      className={cn(
        'p-2 rounded-md border-2 transition-all',
        getSlotStyles()
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-1">
        {getIcon()}
        <span className="text-xs font-medium">{time}</span>
      </div>
    </div>
  );

  if (type === 'booked' && booking) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          {slotContent}
        </HoverCardTrigger>
        <HoverCardContent className="w-64">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">{booking.client_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{booking.service_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground capitalize">{booking.status}</p>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  if (type === 'blocked' && block) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          {slotContent}
        </HoverCardTrigger>
        <HoverCardContent className="w-64">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-destructive" />
              <p className="text-sm font-semibold">Horário Bloqueado</p>
            </div>
            {block.reason && (
              <p className="text-sm text-muted-foreground">{block.reason}</p>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return slotContent;
};
