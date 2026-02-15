import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import b360Logo from '@/assets/b360-logo.png';

interface Step {
  number: number;
  label: string;
  completed: boolean;
  active: boolean;
}

interface OnboardingLayoutProps {
  currentStep: number;
  completedSteps: boolean[];
  children: React.ReactNode;
}

const STEPS = [
  { number: 1, label: 'Localização' },
  { number: 2, label: 'Segmentação' },
  { number: 3, label: 'Serviços' },
  { number: 4, label: 'Profissionais' },
];

export function OnboardingLayout({ currentStep, completedSteps, children }: OnboardingLayoutProps) {
  const steps: Step[] = STEPS.map((s, i) => ({
    ...s,
    completed: completedSteps[i] || false,
    active: s.number === currentStep,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <img src={b360Logo} alt="B360" className="h-8" />
              Bem vindo ao B360
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">Complete o passo a passo inicial para acessar o sistema.</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row min-h-[calc(100vh-73px)]">
        {/* Sidebar */}
        <aside className="w-full lg:w-[300px] flex-shrink-0 p-6 lg:border-r border-slate-700/50">
          <div className="flex lg:flex-col gap-2 lg:gap-0 overflow-x-auto lg:overflow-visible">
            {steps.map((step, idx) => (
              <div key={step.number} className="flex lg:flex-col items-center lg:items-start flex-shrink-0">
                <div className="flex items-center gap-3 py-3 lg:py-4">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all',
                      step.active && 'bg-primary text-primary-foreground shadow-lg shadow-primary/30',
                      step.completed && !step.active && 'bg-primary/20 text-primary',
                      !step.active && !step.completed && 'bg-slate-700 text-slate-400'
                    )}
                  >
                    {step.completed && !step.active ? <Check className="h-5 w-5" /> : step.number}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium transition-colors hidden lg:block',
                      step.active ? 'text-white' : 'text-slate-400'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block w-0.5 h-8 bg-slate-700 ml-[19px]" />
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 lg:p-10">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 lg:p-8 min-h-[500px] flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
