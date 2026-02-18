import { cn } from '@/lib/utils';
import { Clock, User, Ban } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useIsMobile } from '@/hooks/use-mobile';

interface TimeSlotProps {
  time: string;
  type: 'available' | 'booked' | 'booked-external' | 'blocked' | 'off-hours';
  booking?: {
    client_name: string;
    service_name: string;
    status: string;
    duration?: number;
    end_time?: string; // HH:MM
  };
  block?: {
    reason: string | null;
  };
  onClick?: (event: React.MouseEvent) => void;
  isBookingStart?: boolean;
  isBookingMiddle?: boolean;
  isBookingEnd?: boolean;
  compact?: boolean;
}

export const TimeSlot = ({ 
  time, 
  type, 
  booking, 
  block, 
  onClick,
  isBookingStart = true,
  isBookingMiddle = false,
  isBookingEnd = true,
  compact = false
}: TimeSlotProps) => {
  const isMobile = useIsMobile();
  const isBooked = type === 'booked' || type === 'booked-external';
  const isContinuation = isBooked && !isBookingStart;

  const getSlotStyles = () => {
    const isGroupedSlot = isBooked || type === 'blocked';
    // Slots agendados/bloqueados: sem bordas internas para ficarem "colados"
    const seamlessBorder = isGroupedSlot
      ? cn(
          !isBookingStart && 'border-t-0',
          !isBookingEnd && 'border-b-0',
          isBookingMiddle && 'border-t-0 border-b-0'
        )
      : '';

    switch (type) {
      case 'available':
        return 'text-white cursor-pointer bg-[#558b90] border-[#456f73] hover:bg-[#456f73]';
      case 'booked':
        return cn(
          'text-white cursor-pointer bg-[#066d3e] hover:bg-[#055530]',
          seamlessBorder
        );
      case 'booked-external':
        return cn(
          'text-white cursor-pointer bg-[#d19102] hover:bg-[#a87502]',
          seamlessBorder
        );
      case 'blocked':
        return cn(
          'text-white cursor-pointer bg-[#6a1f1f] hover:bg-[#521818]',
          seamlessBorder
        );
      case 'off-hours':
        return 'bg-black border-black cursor-not-allowed';
      default:
        return 'bg-muted border-border';
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

  const isStartWithInfo = isBookingStart && isBooked && booking;
  const slotHeight = compact ? 'h-[20px]' : 'h-[24px] sm:h-[22px]';

  const clientLabel = booking?.client_name?.trim() || 'Cliente';
  const clientShort = clientLabel.split(' ')[0] || clientLabel;

  const slotContent = (
    <div
      className={cn(
        'w-full px-1 sm:px-1 transition-all flex items-center',
        isStartWithInfo ? 'relative overflow-visible z-10' : 'overflow-hidden',
        getSlotStyles(),
        slotHeight,
      )}
      onClick={handleClick}
    >
      {isStartWithInfo && (
        <div className="absolute inset-x-0 top-0 px-1.5 py-0.5 pointer-events-none" style={{ height: compact ? '40px' : '46px' }}>
          {/* Linha 1: horário (ex: 09:15 - 10:00) */}
          <div className="flex items-center gap-1 min-w-0">
            {getStatusDot()}
            <span className="text-[10px] sm:text-[11px] font-semibold leading-tight whitespace-nowrap text-white/90">
              {time.substring(0, 5)}{booking.end_time ? ` - ${booking.end_time}` : ''}
            </span>
          </div>

          {/* Linha 2: nome do cliente - serviço */}
          <div className="text-[11px] sm:text-xs font-bold leading-tight truncate text-white drop-shadow-sm">
            {isMobile ? clientShort : clientLabel}
            {booking.service_name ? ` - ${booking.service_name}` : ''}
          </div>
        </div>
      )}
      {isContinuation && isBookingEnd && (
        <div className="w-full flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white/60" />
        </div>
      )}
      {!isBooked && type === 'available' && (
        <Clock className="h-3 w-3 sm:h-2.5 sm:w-2.5 text-white/70 mx-auto" />
      )}
      {type === 'blocked' && isBookingStart && block?.reason && (
        <span className="text-[9px] text-white/70 truncate mx-auto">{block.reason}</span>
      )}
      {type === 'off-hours' && (
        <span className="text-white/50 text-[8px] mx-auto">—</span>
      )}
    </div>
  );

  // HoverCard apenas para desktop - no mobile interfere com touch scroll
  if (!isMobile && isBooked && booking && isBookingStart) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          {slotContent}
        </HoverCardTrigger>
        <HoverCardContent className="w-56 p-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <User className={cn("h-3.5 w-3.5", type === 'booked-external' ? "text-yellow-500" : "text-green-500")} />
              <p className="text-sm font-semibold">{booking.client_name}</p>
            </div>
            <p className="text-xs text-muted-foreground">{booking.service_name}</p>
            {booking.end_time && (
              <p className="text-xs text-muted-foreground/70">
                {time.substring(0, 5)}–{booking.end_time}
              </p>
            )}
            {booking.duration && (
              <p className="text-xs text-muted-foreground/70">{booking.duration} min</p>
            )}
            <p className="text-[10px] text-muted-foreground capitalize">{booking.status}</p>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  if (!isMobile && type === 'blocked' && block) {
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