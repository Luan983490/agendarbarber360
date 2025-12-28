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
    // Cores conforme solicitado:
    // Branco = disponível
    // Verde = agendado (com cadastro)
    // Amarelo = agendado externo (sem cadastro)
    // Vermelho = bloqueado
    // Preto = fora de funcionamento/dias de folga
    
    switch (type) {
      case 'available':
        return 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 cursor-pointer rounded';
      case 'booked':
        // Verde para agendado com cliente cadastrado
        return cn(
          'bg-green-500/20 border-green-500/60 text-green-900 dark:text-green-100',
          'cursor-pointer hover:bg-green-500/30',
          isBookingStart && !isBookingEnd && 'rounded-t border-b-0',
          isBookingEnd && !isBookingStart && 'rounded-b border-t-0',
          isBookingStart && isBookingEnd && 'rounded',
          isBookingMiddle && 'rounded-none border-t-0 border-b-0'
        );
      case 'booked-external':
        // Amarelo para agendado sem cadastro (externo)
        return cn(
          'bg-yellow-400/25 border-yellow-500/60 text-yellow-900 dark:text-yellow-100',
          'cursor-pointer hover:bg-yellow-400/35',
          isBookingStart && !isBookingEnd && 'rounded-t border-b-0',
          isBookingEnd && !isBookingStart && 'rounded-b border-t-0',
          isBookingStart && isBookingEnd && 'rounded',
          isBookingMiddle && 'rounded-none border-t-0 border-b-0'
        );
      case 'blocked':
        // Vermelho para bloqueado
        return 'bg-red-500/20 border-red-500/50 cursor-pointer hover:bg-red-500/30 rounded';
      case 'off-hours':
        // Preto/escuro para fora de funcionamento
        return 'bg-gray-900 dark:bg-black border-gray-800 dark:border-gray-900 cursor-not-allowed opacity-80 rounded';
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
          {(booking.duration || booking.end_time) && (
            <span className="text-[8px] text-muted-foreground/70 flex-shrink-0">
              {booking.duration ? `${booking.duration}min` : ''}
              {booking.end_time ? `${booking.duration ? ' • ' : ''}até ${booking.end_time}` : ''}
            </span>
          )}
        </div>
      )}
      {isContinuation && (
        <div className="w-full flex justify-center">
          <div className={cn(
            "w-0.5 h-2",
            type === 'booked' ? "bg-green-500/50" : "bg-yellow-500/50"
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