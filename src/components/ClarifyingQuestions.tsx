import React, { useState } from 'react';
import { AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

export interface Question {
  question: string;
  field: string;
  entity_type: string;
  entity_id: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggested_answer?: string;
}

interface ClarifyingQuestionsProps {
  questions: Question[];
  onAnswersProvided: (answers: Record<string, string>) => void;
  onSkip: () => void;
}

export const ClarifyingQuestions: React.FC<ClarifyingQuestionsProps> = ({
  questions,
  onAnswersProvided,
  onSkip,
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-red-300 bg-red-50/50';
      case 'high':
        return 'border-orange-300 bg-orange-50/50';
      case 'medium':
        return 'border-yellow-300 bg-yellow-50/50';
      case 'low':
        return 'border-blue-300 bg-blue-50/50';
      default:
        return 'border-gray-300 bg-gray-50/50';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-700 shadow-sm',
      high: 'bg-orange-100 text-orange-700 shadow-sm',
      medium: 'bg-yellow-100 text-yellow-700 shadow-sm',
      low: 'bg-blue-100 text-blue-700 shadow-sm',
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  const handleAnswerChange = (questionIndex: number, value: string) => {
    setAnswers({
      ...answers,
      [questionIndex]: value,
    });
  };

  const handleSubmit = () => {
    onAnswersProvided(answers);
  };

  const criticalQuestions = questions.filter(q => q.priority === 'critical');
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions.length;

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 p-6 md:p-8 animate-fade-in mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-100/50 rounded-full flex-shrink-0">
            <HelpCircle className="w-8 h-8 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Help Me Understand</h2>
            <p className="text-gray-600 font-medium">
              {criticalQuestions.length > 0
                ? `${criticalQuestions.length} critical question${criticalQuestions.length > 1 ? 's' : ''} need${criticalQuestions.length === 1 ? 's' : ''} your attention`
                : 'A few optional questions to improve accuracy'}
            </p>
          </div>
        </div>
        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center sm:text-right min-w-[100px]">
          <div className="text-2xl font-black text-blue-600 leading-none">
            {answeredCount}<span className="text-lg text-blue-400">/{totalQuestions}</span>
          </div>
          <div className="text-xs font-bold text-blue-500 uppercase tracking-wider mt-1">answered</div>
        </div>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 pb-2">
        {questions.map((question, index) => (
          <div
            key={index}
            className={`p-5 border-2 rounded-xl transition-all duration-300 ${getPriorityColor(question.priority)} ${
              answers[index] ? 'border-green-400 bg-green-50/30' : 'hover:shadow-md'
            }`}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${getPriorityBadge(question.priority)}`}>
                    {question.priority}
                  </span>
                  {answers[index] && (
                    <CheckCircle className="w-5 h-5 text-green-500 animate-fade-in" />
                  )}
                </div>
                <p className="font-semibold text-gray-800 text-lg leading-snug">{question.question}</p>
              </div>
            </div>

            <div className="relative">
                <input
                  type="text"
                  value={answers[index] || ''}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  placeholder={question.suggested_answer || 'Type your answer here...'}
                  className="w-full pl-4 pr-10 py-3 bg-white border border-gray-300 text-gray-800 rounded-lg shadow-inner-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium"
                />
                {answers[index] && (
                   <div className="absolute right-3 top-1/2 -translate-y-1/2">
                       <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                   </div>
                )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <button
          onClick={onSkip}
          className="flex-1 px-6 py-3.5 border-2 border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors focus:ring-4 focus:ring-gray-100"
        >
          Skip for Now
        </button>
        <button
          onClick={handleSubmit}
          disabled={criticalQuestions.length > 0 && answeredCount === 0}
          className="flex-[2] px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2 group"
        >
          Continue
          <span className="bg-white/20 text-white text-xs py-0.5 px-2 rounded-full group-disabled:opacity-50 group-disabled:invisible">
            {answeredCount} answer{answeredCount !== 1 ? 's' : ''}
          </span>
        </button>
      </div>
    </div>
  );
};
