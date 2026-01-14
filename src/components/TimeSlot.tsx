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
        return 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 cursor-pointer';
      case 'booked':
        // Verde para agendado com cliente cadastrado - texto branco para contraste
        return cn(
          'bg-emerald-600 border-emerald-700 text-white',
          'cursor-pointer hover:bg-emerald-700',
          isBookingStart && !isBookingEnd && 'border-b-0',
          isBookingEnd && !isBookingStart && 'border-t-0',
          isBookingMiddle && 'border-t-0 border-b-0'
        );
      case 'booked-external':
        // Amarelo para agendado sem cadastro (externo) - texto escuro para contraste
        return cn(
          'bg-amber-500 border-amber-600 text-amber-950',
          'cursor-pointer hover:bg-amber-600',
          isBookingStart && !isBookingEnd && 'border-b-0',
          isBookingEnd && !isBookingStart && 'border-t-0',
          isBookingMiddle && 'border-t-0 border-b-0'
        );
      case 'blocked':
        // Vermelho para bloqueado - cor personalizada #801010
        return 'text-white cursor-pointer [&]:bg-[#801010] [&]:border-[#600c0c] [&]:hover:bg-[#600c0c]';
      case 'off-hours':
        // Preto/escuro para fora de funcionamento
        return 'bg-gray-900 dark:bg-black border-gray-800 dark:border-gray-900 cursor-not-allowed opacity-80';
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

  // Altura fixa e uniforme para TODOS os slots
  const slotHeight = 'h-[28px]';

  const clientLabel = booking?.client_name?.trim() || 'Cliente';
  // Pega apenas o primeiro nome para mobile
  const clientShort = clientLabel.split(' ')[0] || clientLabel;

  // Continuação de booking usa margem negativa para "colar" no slot anterior
  const continuationStyle = isContinuation ? '-mt-0.5' : '';

  const slotContent = (
    <div
      className={cn(
        // Layout fixo: largura total da célula, overflow hidden para não empurrar outras colunas
        'w-full overflow-hidden px-0.5 sm:px-1 transition-all flex items-center',
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
              className="min-w-0 flex-1 text-[10px] sm:text-xs font-bold leading-tight truncate"
              title={clientLabel}
            >
              {/* Mostra nome curto em mobile, completo em desktop */}
              <span className="sm:hidden">{clientShort}</span>
              <span className="hidden sm:inline">{clientLabel}</span>
            </span>
          </div>

          {/* Mostra duração apenas em telas maiores para evitar overflow */}
          {(booking.duration || booking.end_time) && (
            <div className={cn(
              "hidden sm:block mt-0.5 text-[9px] sm:text-[10px] leading-none truncate font-medium",
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
        <Clock className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-gray-400 mx-auto" />
      )}
      {type === 'blocked' && (
        <Ban className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-white/70 mx-auto" />
      )}
      {type === 'off-hours' && (
        <span className="text-white/50 text-[8px] mx-auto">—</span>
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