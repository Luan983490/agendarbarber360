import { cn } from '@/lib/utils';
import { Clock, User, Scissors, Ban, Info } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

interface TimeSlotProps {
  time: string;
  type: 'available' | 'booked' | 'booked-external' | 'blocked';
  booking?: {
    client_name: string;
    service_name: string;
    status: string;
  };
  block?: {
    reason: string | null;
  };
  onClick?: (event: React.MouseEvent) => void;
}

export const TimeSlot = ({ time, type, booking, block, onClick }: TimeSlotProps) => {
  const getSlotStyles = () => {
    switch (type) {
      case 'available':
        return 'bg-success/10 hover:bg-success/20 border-success/30 cursor-pointer';
      case 'booked':
        return 'bg-primary/10 border-primary/30 cursor-pointer';
      case 'booked-external':
        return 'bg-amber-500/10 border-amber-500/30 cursor-pointer hover:bg-amber-500/20';
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
      case 'booked-external':
        return <User className="h-3 w-3 text-amber-500" />;
      case 'blocked':
        return <Ban className="h-3 w-3 text-destructive" />;
    }
  };

  const getStatusBadge = () => {
    if (type !== 'booked' || !booking) return null;
    
    const statusColors = {
      pending: 'bg-yellow-500',
      confirmed: 'bg-green-500',
      cancelled: 'bg-red-500',
      completed: 'bg-blue-500',
    };
    
    return (
      <div className={cn('w-2 h-2 rounded-full', statusColors[booking.status as keyof typeof statusColors] || 'bg-gray-500')} />
    );
  };

  const slotContent = (
    <div
      className={cn(
        'p-2 rounded-md border-2 transition-all min-h-[60px] flex flex-col justify-between hover:scale-105',
        getSlotStyles()
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-1">
        {getIcon()}
        {getStatusBadge()}
      </div>
      {(type === 'booked' || type === 'booked-external') && booking && (
        <div className="text-[10px] truncate">
          <p className="font-semibold truncate">{booking.client_name}</p>
          <p className="text-muted-foreground truncate">{booking.service_name}</p>
        </div>
      )}
    </div>
  );

  if ((type === 'booked' || type === 'booked-external') && booking) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          {slotContent}
        </HoverCardTrigger>
        <HoverCardContent className="w-64">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className={cn("h-4 w-4", type === 'booked-external' ? "text-amber-500" : "text-primary")} />
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
