import React from 'react';
import { Loader2, Sparkles, AlertCircle, HelpCircle } from 'lucide-react';
import { TemplateSelector } from './TemplateSelector';

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
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 p-6 md:p-8 flex flex-col animate-fade-in mt-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800 tracking-tight">
            <span className="w-2 h-6 bg-blue-500 rounded-full inline-block"></span>
            Event Description
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button
              type="button"
              className="text-gray-400 hover:text-blue-500 transition-colors p-1 rounded-full hover:bg-blue-50"
              aria-label="Help: What to include"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-7 w-64 bg-slate-800 text-white text-xs rounded-xl p-3 shadow-xl hidden group-hover:block z-10 leading-relaxed">
              <p className="font-bold mb-1">What to include:</p>
              <ul className="space-y-0.5 text-slate-300">
                <li>• Event name, dates &amp; location</li>
                <li>• Room names and capacities</li>
                <li>• Session schedules with times</li>
                <li>• Speaker names &amp; emails</li>
                <li>• Any crises or conflicts (prefix with CRISIS:)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Template Selector */}
      <TemplateSelector onSelect={setInputText} />

      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Paste or type your event description here...&#10;&#10;Include:&#10;• Event name, dates, and location&#10;• Rooms with capacities&#10;• Sessions with times, speakers, and durations&#10;• Speaker emails and affiliations&#10;• Any known crises (prefix with CRISIS:)"
        className="w-full h-[360px] p-5 bg-gray-50/50 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white font-mono text-sm resize-none transition-all shadow-inner custom-scrollbar text-gray-800 leading-relaxed"
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
