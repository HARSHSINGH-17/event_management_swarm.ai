import React from 'react';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface InputStepProps {
  inputText: string;
  setInputText: (text: string) => void;
  onExtract: () => void;
  loading: boolean;
  error: string | null;
}

export const InputStep: React.FC<InputStepProps> = ({
  inputText,
  setInputText,
  onExtract,
  loading,
  error
}) => {
  const exampleText = `TechCon 2024 on March 15-17 at San Francisco Convention Center.

Rooms:
- Grand Ballroom (500 capacity)
- Workshop A (100 capacity)

Day 1 Schedule:
9:00 AM - Opening Keynote by Dr. Sarah Chen from Google (Grand Ballroom, 90 minutes)
11:00 AM - Workshop: Kubernetes Basics by Mike Johnson from Red Hat (Workshop A, 120 minutes)

Speakers:
- Dr. Sarah Chen: sarah.chen@google.com
- Mike Johnson: mjohnson@redhat.com

CRISIS: Dr. Chen cancelled due to COVID.`;

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 p-6 md:p-8 flex flex-col animate-fade-in mt-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 tracking-tight">
            <span className="w-2 h-6 bg-blue-500 rounded-full inline-block"></span>
            Event Description
        </h2>
        <button
          onClick={() => setInputText(exampleText)}
          className="text-sm text-blue-600 hover:text-blue-800 font-bold transition-colors hover:bg-blue-50 px-3 py-1.5 rounded-lg"
        >
          Load Example
        </button>
      </div>

      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Paste or type your event description here...&#10;&#10;Example:&#10;- Event name and dates&#10;- Room names and capacities&#10;- Session schedules with speakers&#10;- Speaker contact information&#10;- Any crises or issues"
        className="w-full h-[400px] p-5 bg-gray-50/50 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white font-mono text-sm resize-none transition-all shadow-inner custom-scrollbar text-gray-800 leading-relaxed"
      />

      {error && (
         <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fade-in">
             <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
             <div>
                <h3 className="text-red-900 font-bold">Extraction Error</h3>
                <p className="text-sm text-red-800 font-medium mt-1">{error}</p>
             </div>
         </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-sm font-bold text-gray-400 bg-gray-100 px-4 py-1.5 rounded-full border border-gray-200 shadow-sm">
          {inputText.length} characters
        </span>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={() => setInputText('')}
            disabled={!inputText}
            className="flex-1 sm:flex-none px-6 py-3 border-2 border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 focus:ring-4 focus:ring-gray-100 disabled:opacity-50 transition-all"
          >
            Clear
          </button>
          <button
            onClick={onExtract}
            disabled={loading || !inputText.trim()}
            className="flex-[2] sm:flex-none px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 transition-all w-full sm:w-64"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing Data...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Extract Data
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
