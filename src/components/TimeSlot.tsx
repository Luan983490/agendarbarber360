import { cn } from '@/lib/utils';
import { Clock, User, Scissors, Ban, Info } from 'lucide-react';
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
      ? 'bg-yellow-400/20 border-yellow-400/50' 
      : 'bg-orange-500/20 border-orange-500/50';
    
    switch (type) {
      case 'available':
        return 'bg-success/10 hover:bg-success/20 border-success/30 cursor-pointer';
      case 'booked':
      case 'booked-external':
        return cn(
          baseBooked,
          'cursor-pointer',
          isBookingStart && 'rounded-t-md',
          isBookingEnd && 'rounded-b-md',
          !isBookingStart && 'border-t-0 rounded-t-none',
          !isBookingEnd && 'border-b-0 rounded-b-none',
          isBookingMiddle && 'rounded-none border-t-0 border-b-0'
        );
      case 'blocked':
        return 'bg-destructive/10 border-destructive/30 cursor-pointer';
      case 'off-hours':
        return 'bg-muted/50 border-muted-foreground/20 cursor-not-allowed opacity-50';
      default:
        return 'bg-muted border-border';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'available':
        return <Clock className="h-3 w-3 text-success" />;
      case 'booked':
        return <User className="h-3 w-3 text-yellow-500" />;
      case 'booked-external':
        return <User className="h-3 w-3 text-orange-500" />;
      case 'blocked':
        return <Ban className="h-3 w-3 text-destructive" />;
      case 'off-hours':
        return <Clock className="h-3 w-3 text-muted-foreground/50" />;
    }
  };

  const getStatusBadge = () => {
    if (!isBooked || !booking) return null;
    
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

  const handleClick = (event: React.MouseEvent) => {
    // Previne propagação dupla de eventos
    event.stopPropagation();
    onClick?.(event);
  };

  // Para slots de continuação (não início), mostrar visual simplificado
  const slotContent = (
    <div
      className={cn(
        'p-1 sm:p-2 border sm:border-2 transition-all flex flex-col justify-between active:scale-[0.98] sm:hover:brightness-95',
        getSlotStyles(),
        isBookingStart && 'min-h-[40px] sm:min-h-[60px]',
        isContinuation && 'min-h-[24px] sm:min-h-[36px]',
        !isBooked && 'rounded-md min-h-[40px] sm:min-h-[60px] sm:hover:scale-105'
      )}
      onClick={handleClick}
    >
      {isBookingStart && (
        <>
          <div className="flex items-center justify-between gap-0.5 sm:gap-1">
            {getIcon()}
            {getStatusBadge()}
          </div>
          {isBooked && booking && (
            <div className="text-[8px] sm:text-[10px] truncate leading-tight">
              <p className="font-semibold truncate">{booking.client_name}</p>
              <p className="text-muted-foreground truncate hidden sm:block">{booking.service_name}</p>
              {booking.duration && (
                <p className="text-muted-foreground/70 text-[7px] sm:text-[9px] hidden sm:block">
                  {booking.duration} min
                </p>
              )}
            </div>
          )}
        </>
      )}
      {isContinuation && (
        <div className="flex items-center justify-center h-full">
          <div className={cn(
            "w-0.5 h-full min-h-[16px]",
            type === 'booked' ? "bg-yellow-400/40" : "bg-orange-500/40"
          )} />
        </div>
      )}
      {!isBooked && (
        <>
          <div className="flex items-center justify-between gap-0.5 sm:gap-1">
            {getIcon()}
          </div>
        </>
      )}
    </div>
  );

  if (isBooked && booking && isBookingStart) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          {slotContent}
        </HoverCardTrigger>
        <HoverCardContent className="w-64">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className={cn("h-4 w-4", type === 'booked-external' ? "text-orange-500" : "text-yellow-500")} />
              <p className="text-sm font-semibold">{booking.client_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{booking.service_name}</p>
            </div>
            {booking.duration && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{booking.duration} minutos</p>
              </div>
            )}
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