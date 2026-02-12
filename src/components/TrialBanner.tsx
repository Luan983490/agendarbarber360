import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrialBannerProps {
  barbershopId: string | null;
}

export function TrialBanner({ barbershopId }: TrialBannerProps) {
  const { trial, subscription } = useSubscription(barbershopId);
  const navigate = useNavigate();

  // Don't render if no trial data or trial expired
  if (!trial || trial.is_expired) return null;

  // Don't render if user has a paid subscription (not teste_gratis)
  if (subscription?.status === 'ativo' && subscription.plan_type !== 'teste_gratis') return null;

  const daysLeft = trial.days_left;

  const getUrgencyConfig = () => {
    if (daysLeft >= 15) {
      return {
        bgClass: 'bg-emerald-950/60 border-emerald-800/50',
        textClass: 'text-emerald-300',
        accentClass: 'text-emerald-400',
        btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        icon: Sparkles,
        label: 'Teste Gratuito',
      };
    }
    if (daysLeft >= 8) {
      return {
        bgClass: 'bg-amber-950/60 border-amber-800/50',
        textClass: 'text-amber-300',
        accentClass: 'text-amber-400',
        btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
        icon: Clock,
        label: 'Teste Encerrando',
      };
    }
    return {
      bgClass: 'bg-red-950/60 border-red-800/50',
      textClass: 'text-red-300',
      accentClass: 'text-red-400',
      btnClass: 'bg-red-600 hover:bg-red-700 text-white',
      icon: AlertTriangle,
      label: 'Teste Expirando',
    };
  };

  const config = getUrgencyConfig();
  const Icon = config.icon;

  return (
    <div className={cn('w-full border-b px-3 py-2 sm:px-4 sm:py-3', config.bgClass)}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={cn('h-4 w-4 shrink-0', config.accentClass)} />
          <span className={cn('text-xs sm:text-sm font-medium', config.textClass)}>
            🎉 Você tem{' '}
            <span className={cn('font-bold', config.accentClass)}>
              {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}
            </span>{' '}
            restantes no seu teste gratuito!
          </span>
        </div>
        <Button
          size="sm"
          className={cn('shrink-0 text-xs h-7 px-3', config.btnClass)}
          onClick={() => navigate('/planos')}
        >
          Assinar Agora
        </Button>
      </div>
    </div>
  );
}
