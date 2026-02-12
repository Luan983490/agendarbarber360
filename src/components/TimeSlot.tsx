import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

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
    switch (type) {
      case 'available':
        return 'bg-white hover:bg-gray-50 cursor-pointer border-b border-dashed border-gray-200';
      case 'booked':
        return cn(
          'text-white cursor-pointer [&]:bg-[#4CAF50] [&]:hover:bg-[#43A047]',
          isBookingStart && !isBookingEnd && 'border-b-0',
          isBookingEnd && !isBookingStart && 'border-t-0',
          isBookingMiddle && 'border-t-0 border-b-0'
        );
      case 'booked-external':
        return cn(
          'text-white cursor-pointer [&]:bg-[#FF9800] [&]:hover:bg-[#F57C00]',
          isBookingStart && !isBookingEnd && 'border-b-0',
          isBookingEnd && !isBookingStart && 'border-t-0',
          isBookingMiddle && 'border-t-0 border-b-0'
        );
      case 'blocked':
        return 'text-white cursor-pointer [&]:bg-[#E53935] [&]:hover:bg-[#C62828]';
      case 'off-hours':
        return 'cursor-not-allowed off-hours-pattern';
      default:
        return 'bg-white';
    }
  };

  const getStatusDot = () => {
    if (!isBooked || !booking) return null;
    
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-300',
      confirmed: 'bg-green-200',
      cancelled: 'bg-red-300',
      completed: 'bg-blue-300',
    };
    
    return (
      <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', statusColors[booking.status] || 'bg-gray-400')} />
    );
  };

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onClick?.(event);
  };

  // Altura fixa e uniforme para TODOS os slots
  const slotHeight = 'h-[32px] sm:h-[30px] lg:h-[28px]';

  const clientLabel = booking?.client_name?.trim() || 'Cliente';
  // Pega apenas o primeiro nome para mobile
  const clientShort = clientLabel.split(' ')[0] || clientLabel;

  // Continuação de booking usa margem negativa para "colar" no slot anterior
  const continuationStyle = isContinuation ? '-mt-0.5' : '';

  const slotContent = (
    <div
      className={cn(
        // Layout fixo: largura total da célula, overflow hidden para não empurrar outras colunas
        'w-full overflow-hidden px-1 sm:px-1 transition-all flex items-center',
        getSlotStyles(),
        slotHeight,
        continuationStyle
      )}
      onClick={handleClick}
    >
      {isBookingStart && isBooked && booking && (
        <div className="min-w-0 w-full overflow-hidden px-0.5">
          <div className="flex items-center gap-1 min-w-0">
            {getStatusDot()}
            <span
              className="min-w-0 flex-1 text-xs sm:text-xs font-bold leading-tight truncate"
              title={clientLabel}
            >
              {/* Mostra nome curto em mobile, completo em desktop */}
              <span className="sm:hidden">{clientShort}</span>
              <span className="hidden sm:inline">{clientLabel}</span>
            </span>
          </div>

          {/* Mostra duração em todas as telas */}
          {(booking.duration || booking.end_time) && (
            <div className={cn(
              "mt-0.5 text-[9px] sm:text-[10px] leading-none truncate font-medium",
              type === 'booked' ? 'text-white/80' : 'text-amber-950/70'
            )}>
              {booking.duration ? `${booking.duration}min` : ''}
              {booking.end_time ? ` • ${booking.end_time}` : ''}
            </div>
          )}
        </div>
      )}
      {isContinuation && (
        <div className="w-full flex justify-center">
          <div className={cn(
            "w-1 h-2 sm:h-3 rounded-full",
            type === 'booked' ? "bg-white/40" : "bg-amber-950/30"
          )} />
        </div>
      )}
      {!isBooked && type === 'available' && (
        <span className="text-transparent mx-auto text-[8px]">·</span>
      )}
      {type === 'blocked' && (
        <span className="text-white/70 text-[10px] mx-auto font-medium">✕</span>
      )}
      {type === 'off-hours' && (
        <span className="text-transparent text-[8px] mx-auto">—</span>
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
              <User className={cn("h-3.5 w-3.5", type === 'booked-external' ? "text-orange-500" : "text-green-500")} />
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