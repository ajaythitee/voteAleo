import { ReactNode } from 'react';

export interface StepperStep {
  id: string;
  label: string;
  description?: string;
}

interface StepperProps {
  steps: StepperStep[];
  currentStepId: string;
  className?: string;
}

export function Stepper({
  steps,
  currentStepId,
  className = '',
}: StepperProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStepId);

  return (
    <div className={`flex flex-col md:flex-row md:items-center gap-4 md:gap-6 ${className}`}>
      {steps.map((step, index) => {
        const isActive = step.id === currentStepId;
        const isCompleted = index < currentIndex;

        return (
          <div key={step.id} className="flex items-start md:items-center gap-3 md:flex-1">
            <div
              className={`
                flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold
                ${isActive ? 'bg-emerald-500 text-white border-emerald-400 shadow-glow' : ''}
                ${isCompleted && !isActive ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/40' : ''}
                ${!isActive && !isCompleted ? 'bg-white/5 text-text-subtle border-border-subtle' : ''}
              `}
            >
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-text-muted'}`}>
                {step.label}
              </p>
              {step.description && (
                <p className="text-xs text-text-subtle mt-1">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

