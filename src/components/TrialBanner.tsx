import { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';

interface TrialBannerProps {
  barbershopId: string | null;
}

export const TrialBanner = forwardRef<HTMLDivElement, TrialBannerProps>(
  ({ barbershopId }, ref) => {
    const { trial, subscription } = useSubscription(barbershopId);
    const navigate = useNavigate();

    // Don't render if no trial data or trial expired
    if (!trial || trial.is_expired) return null;

    // Don't render if user has a paid subscription (not teste_gratis)
    if (subscription?.status === 'ativo' && subscription.plan_type !== 'teste_gratis') return null;

    const daysLeft = trial.days_left;

    return (
      <div
        ref={ref}
        className="fixed top-0 left-0 right-0 z-[60] bg-red-600 px-3 py-1.5 sm:px-4 sm:py-2"
      >
        <div className="flex items-center justify-center gap-3 flex-nowrap">
          <span className="text-xs sm:text-sm font-medium text-gray-200">
            Seu teste grátis expira em{' '}
            <span className="font-bold text-white">
              {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}
            </span>
          </span>
          <Button
            size="sm"
            className="shrink-0 text-[10px] sm:text-xs h-5 px-2 sm:h-6 sm:px-3 rounded-sm leading-none bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => navigate('/planos')}
          >
            Assinar
            <span className="hidden sm:inline">&nbsp;Agora</span>
          </Button>
        </div>
      </div>
    );
  }
);

TrialBanner.displayName = 'TrialBanner';
