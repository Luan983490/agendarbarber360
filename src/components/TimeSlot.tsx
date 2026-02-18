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
    // Cores conforme solicitado:
    // #0a007e (azul escuro) = disponível
    // #00700b (verde escuro) = agendado (com cadastro)
    // Amarelo = agendado externo (sem cadastro)
    // #5e0000 (vermelho escuro) = bloqueado
    // Preto = fora de funcionamento/dias de folga
    
    switch (type) {
      case 'available':
        // Disponível - #558b90
        return 'text-white cursor-pointer [&]:bg-[#558b90] [&]:border-[#456f73] [&]:hover:bg-[#456f73]';
      case 'booked':
        // Agendado - #066d3e (verde escuro) com borda esquerda branca para destaque
        return cn(
          'text-white cursor-pointer [&]:bg-[#066d3e] [&]:border-[#055530] [&]:hover:bg-[#055530] border-l-[3px] border-l-white/60',
          isBookingStart && !isBookingEnd && 'border-b-0',
          isBookingEnd && !isBookingStart && 'border-t-0',
          isBookingMiddle && 'border-t-0 border-b-0'
        );
      case 'booked-external':
        // Sem Cadastro - #d19102 (amarelo/dourado) com borda esquerda para destaque
        return cn(
          'text-white cursor-pointer [&]:bg-[#d19102] [&]:border-[#a87502] [&]:hover:bg-[#a87502] border-l-[3px] border-l-white/60',
          isBookingStart && !isBookingEnd && 'border-b-0',
          isBookingEnd && !isBookingStart && 'border-t-0',
          isBookingMiddle && 'border-t-0 border-b-0'
        );
      case 'blocked':
        // Bloqueado - #6a1f1f (vermelho escuro/marrom)
        return 'text-white cursor-pointer [&]:bg-[#6a1f1f] [&]:border-[#521818] [&]:hover:bg-[#521818]';
      case 'off-hours':
        // Fora do expediente - #000000 (preto)
        return '[&]:bg-[#000000] [&]:border-[#000000] cursor-not-allowed';
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

  // Altura uniforme para todos os slots
  const isStartWithInfo = isBookingStart && isBooked && booking;
  const slotHeight = compact ? 'h-[20px]' : 'h-[24px] sm:h-[22px]';

  const clientLabel = booking?.client_name?.trim() || 'Cliente';
  // Pega apenas o primeiro nome para mobile
  const clientShort = clientLabel.split(' ')[0] || clientLabel;

  // Continuação de booking usa margem negativa para "colar" no slot anterior
  const continuationStyle = isContinuation ? '-mt-0.5' : '';

  const slotContent = (
    <div
      className={cn(
        'w-full px-1 sm:px-1 transition-all flex items-center',
        // Booking start: relative + overflow-visible para o conteúdo fluir no próximo slot
        isStartWithInfo ? 'relative overflow-visible z-10' : 'overflow-hidden',
        getSlotStyles(),
        slotHeight,
        continuationStyle
      )}
      onClick={handleClick}
    >
      {isStartWithInfo && (
        <div className="absolute inset-x-0 top-0 px-1.5 py-0.5 pointer-events-none" style={{ height: compact ? '40px' : '46px' }}>
          <div className="flex items-center gap-1 min-w-0">
            {getStatusDot()}
            <span
              className="min-w-0 flex-1 text-[11px] sm:text-xs font-bold leading-tight truncate drop-shadow-sm"
              title={clientLabel}
            >
              <span className="sm:hidden">{clientShort}</span>
              <span className="hidden sm:inline">{clientLabel}</span>
            </span>
          </div>

          {(booking.duration || booking.end_time) && (
            <div className={cn(
              "text-[10px] sm:text-[11px] leading-snug font-semibold whitespace-nowrap",
              type === 'booked' ? 'text-white/90' : 'text-amber-950/80'
            )}>
              {booking.end_time ? `${time.substring(0, 5)}–${booking.end_time}` : ''}
              {booking.duration ? ` · ${booking.duration}min` : ''}
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
        <Clock className="h-3 w-3 sm:h-2.5 sm:w-2.5 text-white/70 mx-auto" />
      )}
      {type === 'blocked' && (
        <Ban className="h-3 w-3 sm:h-2.5 sm:w-2.5 text-white/70 mx-auto" />
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