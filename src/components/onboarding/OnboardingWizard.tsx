import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useToast } from '@/hooks/use-toast';
import { OnboardingLayout } from './OnboardingLayout';
import { LocationStep } from './steps/LocationStep';
import { SegmentationStep } from './steps/SegmentationStep';
import { ServicesStep } from './steps/ServicesStep';
import { ProfessionalsStep } from './steps/ProfessionalsStep';
import { Loader2 } from 'lucide-react';
import b360Logo from '@/assets/b360-logo.png';

interface OnboardingWizardProps {
  barbershopId: string;
}

export function OnboardingWizard({ barbershopId }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { status, isLoading, completeStep } = useOnboarding(barbershopId);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (status) {
      if (status.is_completed) {
        navigate('/dashboard', { replace: true });
        return;
      }
      setCurrentStep(status.current_step || 1);
    }
  }, [status, navigate]);

  const handleStepComplete = async (stepNumber: number) => {
    try {
      await completeStep(stepNumber);
      if (stepNumber === 4) {
        toast({ title: 'Configuração concluída!', description: 'Bem-vindo ao B360!' });
        navigate('/dashboard', { replace: true });
      } else {
        setCurrentStep(stepNumber + 1);
      }
    } catch {
      // Error handled by hook
    }
  };

  const handleSkip = () => {
    navigate('/dashboard', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <img src={b360Logo} alt="B360" className="h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400">Carregando configuração...</p>
        </div>
      </div>
    );
  }

  const completedSteps = [
    status?.step1_completed || false,
    status?.step2_completed || false,
    status?.step3_completed || false,
    status?.step4_completed || false,
  ];

  return (
    <OnboardingLayout
      currentStep={currentStep}
      completedSteps={completedSteps}
      onSkip={handleSkip}
    >
      {currentStep === 1 && (
        <LocationStep
          barbershopId={barbershopId}
          onComplete={() => handleStepComplete(1)}
        />
      )}
      {currentStep === 2 && (
        <SegmentationStep
          barbershopId={barbershopId}
          onComplete={() => handleStepComplete(2)}
          onBack={() => setCurrentStep(1)}
        />
      )}
      {currentStep === 3 && (
        <ServicesStep
          barbershopId={barbershopId}
          onComplete={() => handleStepComplete(3)}
          onBack={() => setCurrentStep(2)}
        />
      )}
      {currentStep === 4 && (
        <ProfessionalsStep
          barbershopId={barbershopId}
          onComplete={() => handleStepComplete(4)}
          onBack={() => setCurrentStep(3)}
        />
      )}
    </OnboardingLayout>
  );
}
