import { AlertTriangle, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProvisionalAccessBannerProps {
  minutesRemaining: number;
  secondsRemaining: number;
  onResend: () => void;
  onRefresh: () => void;
  isResending: boolean;
}

export const ProvisionalAccessBanner = ({
  minutesRemaining,
  secondsRemaining,
  onResend,
  onRefresh,
  isResending,
}: ProvisionalAccessBannerProps) => {
  const isUrgent = minutesRemaining < 10;
  const timeDisplay = minutesRemaining > 0 
    ? `${minutesRemaining} minuto${minutesRemaining !== 1 ? 's' : ''}`
    : `${secondsRemaining} segundo${secondsRemaining !== 1 ? 's' : ''}`;

  return (
    <div 
      className={cn(
        "w-full px-4 py-3 flex items-center justify-between gap-4 flex-wrap",
        isUrgent 
          ? "bg-destructive/10 border-b border-destructive/20" 
          : "bg-warning/10 border-b border-warning/20"
      )}
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className={cn(
          "h-5 w-5 flex-shrink-0",
          isUrgent ? "text-destructive" : "text-warning"
        )} />
        <p className={cn(
          "text-sm font-medium",
          isUrgent ? "text-destructive" : "text-warning-foreground"
        )}>
          Verifique seu e-mail! Você tem mais <strong>{timeDisplay}</strong> de acesso provisório.
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Já confirmei
        </Button>
        <Button
          variant={isUrgent ? "destructive" : "outline"}
          size="sm"
          onClick={onResend}
          disabled={isResending}
          className="text-xs"
        >
          <Mail className="h-3 w-3 mr-1" />
          {isResending ? "Enviando..." : "Reenviar link"}
        </Button>
      </div>
    </div>
  );
};
