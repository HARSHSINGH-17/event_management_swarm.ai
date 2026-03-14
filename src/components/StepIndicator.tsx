import React from 'react';
import { Check } from 'lucide-react';

export type WizardStep = 'input' | 'questions' | 'review' | 'applying' | 'success';

const steps = [
  { id: 'input', label: 'Describe Event' },
  { id: 'questions', label: 'Clarify Details' },
  { id: 'review', label: 'Review' },
  { id: 'success', label: 'Complete' }
];

interface StepIndicatorProps {
  currentStep: WizardStep;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const stepIndex = {
    input: 0,
    questions: 1,
    review: 2,
    applying: 2,
    success: 3
  }[currentStep];

  return (
    <div className="flex items-center justify-center w-full max-w-3xl mx-auto px-4 sm:px-0">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center relative z-10 w-20 sm:w-24">
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base border-2 transition-all duration-500 shadow-sm ${
                index < stepIndex
                  ? 'bg-green-500 border-green-500 text-white shadow-green-200'
                  : index === stepIndex
                  ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200 animate-pulse-light'
                  : 'bg-white border-gray-200 text-gray-400'
              }`}
            >
              {index < stepIndex ? (
                <Check className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={3} />
              ) : (
                index + 1
              )}
            </div>
            <span className={`text-xs sm:text-sm mt-3 font-semibold text-center transition-colors duration-300 ${
              index < stepIndex ? 'text-green-700' : index === stepIndex ? 'text-blue-700' : 'text-gray-400'
            }`}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="flex-1 mt-5 sm:mt-6 h-1 -mx-4 sm:-mx-6 rounded-full overflow-hidden bg-gray-100 flex items-center">
                 <div className={`h-full transition-all duration-700 ease-in-out ${
                    index < stepIndex ? 'w-full bg-green-400/80' : 'w-0 bg-gray-200'
                 }`} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
