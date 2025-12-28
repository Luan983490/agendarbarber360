import { cn } from '@/lib/utils';
import { Clock, User, Ban } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

interface TimeSlotProps {
  time: string;
  type: 'available' | 'booked' | 'booked-external' | 'blocked' | 'off-hours';
  booking?: {
    client_name: string;
    service_name: string;
    status: string;
    duration?: number;
  };
  block?: {
    reason: string | null;
  };
  onClick?: (event: React.MouseEvent) => void;
  isBookingStart?: boolean;
  isBookingMiddle?: boolean;
  isBookingEnd?: boolean;
}

export const TimeSlot = ({ 
  time, 
  type, 
  booking, 
  block, 
  onClick,
  isBookingStart = true,
  isBookingMiddle = false,
  isBookingEnd = true
}: TimeSlotProps) => {
  const isBooked = type === 'booked' || type === 'booked-external';
  const isContinuation = isBooked && !isBookingStart;

  const getSlotStyles = () => {
    const baseBooked = type === 'booked' 
      ? 'bg-yellow-400/25 border-yellow-400/60' 
      : 'bg-orange-500/25 border-orange-500/60';
    
    switch (type) {
      case 'available':
        return 'bg-success/10 hover:bg-success/20 border-success/30 cursor-pointer rounded';
      case 'booked':
      case 'booked-external':
        return cn(
          baseBooked,
          'cursor-pointer hover:brightness-95',
          isBookingStart && !isBookingEnd && 'rounded-t border-b-0',
          isBookingEnd && !isBookingStart && 'rounded-b border-t-0',
          isBookingStart && isBookingEnd && 'rounded',
          isBookingMiddle && 'rounded-none border-t-0 border-b-0'
        );
      case 'blocked':
        return 'bg-destructive/10 border-destructive/30 cursor-pointer rounded';
      case 'off-hours':
        return 'bg-muted/40 border-muted-foreground/10 cursor-not-allowed opacity-40 rounded';
      default:
        return 'bg-muted border-border rounded';
    }
  };

  const getStatusDot = () => {
    if (!isBooked || !booking) return null;
    
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-500',
      confirmed: 'bg-green-500',
      cancelled: 'bg-red-500',
      completed: 'bg-blue-500',
    };
    
    return (
      <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusColors[booking.status] || 'bg-gray-500')} />
    );
  };

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onClick?.(event);
  };

  // Altura compacta baseada na posição
  const slotHeight = isBookingStart 
    ? 'h-[28px] sm:h-[32px]' 
    : isContinuation 
      ? 'h-[20px] sm:h-[24px]' 
      : 'h-[28px] sm:h-[32px]';

  const slotContent = (
    <div
      className={cn(
        'px-1 border transition-all flex items-center',
        getSlotStyles(),
        slotHeight
      )}
      onClick={handleClick}
    >
      {isBookingStart && isBooked && booking && (
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {getStatusDot()}
          <span className="text-[9px] sm:text-[10px] font-medium truncate leading-none">
            {booking.client_name}
          </span>
          {booking.duration && (
            <span className="text-[8px] text-muted-foreground/70 flex-shrink-0">
              {booking.duration}min
            </span>
          )}
        </div>
      )}
      {isContinuation && (
        <div className="w-full flex justify-center">
          <div className={cn(
            "w-0.5 h-2",
            type === 'booked' ? "bg-yellow-400/50" : "bg-orange-500/50"
          )} />
        </div>
      )}
      {!isBooked && type === 'available' && (
        <Clock className="h-2.5 w-2.5 text-success/60 mx-auto" />
      )}
      {type === 'blocked' && (
        <Ban className="h-2.5 w-2.5 text-destructive/60 mx-auto" />
      )}
    </div>
  );

  // HoverCard apenas para o slot inicial do booking
  if (isBooked && booking && isBookingStart) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          {slotContent}
        </HoverCardTrigger>
        <HoverCardContent className="w-56 p-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <User className={cn("h-3.5 w-3.5", type === 'booked-external' ? "text-orange-500" : "text-yellow-500")} />
              <p className="text-sm font-semibold">{booking.client_name}</p>
            </div>
            <p className="text-xs text-muted-foreground">{booking.service_name}</p>
            {booking.duration && (
              <p className="text-xs text-muted-foreground/70">{booking.duration} min</p>
            )}
            <p className="text-[10px] text-muted-foreground capitalize">{booking.status}</p>
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
        <HoverCardContent className="w-48 p-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-destructive">Bloqueado</p>
            {block.reason && (
              <p className="text-xs text-muted-foreground">{block.reason}</p>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return slotContent;
};