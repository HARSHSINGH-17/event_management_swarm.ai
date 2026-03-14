import React from 'react';
import { CheckCircle, ArrowRight, RefreshCw, Cpu, Activity, PlaySquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SuccessStepProps {
  eventId: string | null;
  onStartOver: () => void;
  onGoToSwarm: () => void;
}

export const SuccessStep: React.FC<SuccessStepProps> = ({
  eventId,
  onStartOver,
  onGoToSwarm
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 p-8 md:p-12 text-center animate-fade-in mt-6">
      
      <div className="relative inline-block w-24 h-24 mb-6">
         <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-20"></div>
         <div className="relative w-full h-full bg-gradient-to-tr from-green-100 to-emerald-50 rounded-full border-4 border border-green-200 flex items-center justify-center shadow-inner shadow-green-500/20">
           <CheckCircle className="w-12 h-12 text-green-600 drop-shadow-sm" />
         </div>
      </div>

      <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">
        Event Crafted <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600 lg:animate-pulse">Successfully!</span>
      </h2>
      <p className="text-gray-500 font-medium text-lg max-w-lg mx-auto mb-4">
        Your data has been structured and applied to the central registry. AI swarm agents are now standing by to execute operations.
      </p>

      {eventId && (
        <div className="inline-flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mb-10 group transition-all hover:bg-slate-100 cursor-pointer">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">ID</span>
            <span className="font-mono text-sm text-slate-700 font-semibold">{eventId}</span>
        </div>
      )}

      <div className="max-w-md mx-auto space-y-4">
        <button
          onClick={onGoToSwarm}
          className="w-full px-8 py-4.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-3 text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all group"
        >
          <Cpu className="w-6 h-6 animate-pulse" />
          Go to Swarm Control
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={onStartOver}
          className="w-full px-6 py-4 border-2 border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 flex items-center justify-center gap-2 transition-all focus:ring-4 focus:ring-slate-100"
        >
          <RefreshCw className="w-5 h-5 opacity-70" />
          Extract Another Event
        </button>
      </div>

      <div className="mt-14 max-w-2xl mx-auto rounded-xl overflow-hidden border border-slate-200 bg-white grid grid-cols-1 md:grid-cols-2 text-left shadow-sm">
        <div className="p-6 md:border-r border-slate-100 bg-slate-50">
           <div className="flex items-center gap-2 mb-4">
               <Activity className="w-5 h-5 text-indigo-500" />
               <h3 className="font-black text-slate-800 tracking-tight text-lg">Swarm Operations</h3>
           </div>
           <ul className="text-sm text-slate-600 font-medium space-y-2.5">
             <li className="flex items-start gap-2">
                 <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                 Allocate agent dispatch routines in Swarm Control.
             </li>
             <li className="flex items-start gap-2">
                 <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                 Generate participant schedules autonomosly.
             </li>
           </ul>
        </div>
        <div className="p-6">
           <div className="flex items-center gap-2 mb-4">
               <PlaySquare className="w-5 h-5 text-rose-500" />
               <h3 className="font-black text-slate-800 tracking-tight text-lg">Crisis Testing</h3>
           </div>
           <ul className="text-sm text-slate-600 font-medium space-y-2.5">
              <li className="flex items-start gap-2">
                 <div className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                 Trigger test scenarios to evaluate autonomous conflict resolution.
             </li>
             <li className="flex items-start gap-2">
                 <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                 Watch email agents correct schedules instantly.
             </li>
           </ul>
        </div>
      </div>
    </div>
  );
};
