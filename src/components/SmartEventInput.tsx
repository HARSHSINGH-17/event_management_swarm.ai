import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { ClarifyingQuestions, Question } from './ClarifyingQuestions';
import { StepIndicator, WizardStep } from './StepIndicator';
import { InputStep } from './InputStep';
import { ReviewStep } from './ReviewStep';
import { SuccessStep } from './SuccessStep';
import { useNavigate } from 'react-router-dom';

export interface ExtractedData {
  event?: {
    name?: string;
    start_date?: string;
    end_date?: string;
    location?: string;
    theme?: string;
    confidence?: number;
  };
  rooms?: Array<{
    id?: string;
    name?: string;
    capacity?: number;
    confidence?: number;
  }>;
  sessions?: Array<{
    id?: string;
    title?: string;
    speaker_name?: string;
    start_time?: string;
    end_time?: string;
    duration_minutes?: number;
    confidence?: number;
  }>;
  speakers?: Array<{
    id?: string;
    name?: string;
    email?: string;
    affiliation?: string;
    confidence?: number;
  }>;
  crises?: Array<{
    type?: string;
    description?: string;
    severity?: string;
    confidence?: number;
  }>;
}

interface ExtractionResponse {
  success: boolean;
  extracted_data: ExtractedData;
  issues: string[];
  clarifying_questions?: Question[];
  needs_clarification?: boolean;
  processing_time_ms?: number;
}

export const SmartEventInput: React.FC = () => {
  const [step, setStep] = useState<WizardStep>('input');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Step 1: Extract data
  const handleExtract = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/events/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail?.message || errorData.detail || 'Extraction failed');
      }

      const data: ExtractionResponse = await response.json();
      
      if (!data.success && (data as any).error) {
        throw new Error((data as any).error);
      }

      setExtractedData(data.extracted_data);
      setQuestions(data.clarifying_questions || []);

      // Decide next step
      if (data.clarifying_questions && data.clarifying_questions.length > 0) {
        setStep('questions');
      } else {
        setStep('review');
      }
    } catch (err: any) {
      console.error("Extraction error:", err);
      setError(err.message || 'Failed to extract data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle clarifying answers
  const handleAnswersProvided = (providedAnswers: Record<string, string>) => {
    setAnswers({ ...answers, ...providedAnswers });
    setStep('review');
  };

  const handleSkipQuestions = () => {
    setStep('review');
  };

  // Step 3: Apply data
  const handleApply = async () => {
    setStep('applying');
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/events/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extracted_data: extractedData,
          answers: answers,
          questions: questions
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detailMsg = errorData.detail?.message || errorData.detail;
        const subErrs = errorData.detail?.errors?.join(', ');
        throw new Error(subErrs ? `${detailMsg}: ${subErrs}` : (detailMsg || 'Failed to apply data'));
      }

      const result = await response.json();
      setEventId(result.event_id);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to apply event data.');
      setStep('review'); // Go back to review on error
    }
  };

  // Reset to start over
  const handleStartOver = () => {
    setStep('input');
    setInputText('');
    setExtractedData(null);
    setQuestions([]);
    setAnswers({});
    setError(null);
    setEventId(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 mt-12 lg:mt-16 mb-20 animate-fade-in">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-100 to-indigo-50 rounded-full flex items-center justify-center shadow-inner relative">
             <div className="absolute inset-0 rounded-full bg-blue-400 opacity-20 blur-md"></div>
             <Sparkles className="w-8 h-8 text-blue-600 relative z-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700">Smart Event Creator</h1>
        </div>
        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-medium">
          Describe your event in plain English - AI extracts all the details seamlessly into structured data.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-10">
        <StepIndicator currentStep={step} />
      </div>

      {/* Step View Renderers */}
      <div className="transition-all duration-300 transform-gpu relative">
        {step === 'input' && (
          <InputStep
            inputText={inputText}
            setInputText={setInputText}
            onExtract={handleExtract}
            loading={loading}
            error={error}
          />
        )}

        {step === 'questions' && (
          <div className="max-w-4xl mx-auto">
             <ClarifyingQuestions
               questions={questions}
               onAnswersProvided={handleAnswersProvided}
               onSkip={handleSkipQuestions}
             />
          </div>
        )}

        {step === 'review' && extractedData && (
          <div className="max-w-5xl mx-auto">
             <ReviewStep
               extractedData={extractedData}
               answers={answers}
               questions={questions}
               onApply={handleApply}
               onBack={() => questions.length > 0 ? setStep('questions') : setStep('input')}
               error={error}
             />
          </div>
        )}

        {step === 'applying' && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 p-16 text-center max-w-2xl mx-auto animate-fade-in mt-6">
            <div className="relative inline-flex items-center justify-center mb-8">
               <div className="w-20 h-20 bg-blue-100 rounded-full animate-ping absolute opacity-70"></div>
               <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center relative z-10 shadow-lg shadow-blue-500/40">
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
               </div>
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-wide">Synthesizing Workspace...</h2>
            <p className="text-slate-500 font-medium text-lg">Aligning variables and constructing entities in backend state...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="max-w-4xl mx-auto">
             <SuccessStep
               eventId={eventId}
               onStartOver={handleStartOver}
               onGoToSwarm={() => navigate('/swarm-control')}
             />
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        @keyframes pulse-light {
            0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
            50% { box-shadow: 0 0 0 8px rgba(37, 99, 235, 0); }
        }
        .animate-pulse-light { animation: pulse-light 2s infinite ease-out; }
      `}</style>
    </div>
  );
};
