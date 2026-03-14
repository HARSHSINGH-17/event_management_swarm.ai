import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, ArrowRight, ArrowLeft, ChevronDown, ChevronUp, Calendar, Users, MapPin, AlertCircle } from 'lucide-react';
import type { ExtractedData } from './SmartEventInput';
import type { Question } from './ClarifyingQuestions';

interface ReviewStepProps {
  extractedData: ExtractedData;
  answers: Record<string, string>;
  questions: Question[];
  onApply: () => void;
  onBack: () => void;
  error: string | null;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  extractedData,
  answers,
  questions,
  onApply,
  onBack,
  error
}) => {
  const mergedData = applyAnswersToData(extractedData, answers, questions);
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 p-6 md:p-8 animate-fade-in mt-6">
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
        <div className="p-3 bg-green-100/50 rounded-full flex-shrink-0 shadow-sm shadow-green-200">
             <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Review Your Event</h2>
          <p className="text-gray-600 font-medium">
            Verify everything looks correct before creating
            {answeredCount > 0 && <span className="text-blue-500 font-semibold"> • {answeredCount} question{answeredCount > 1 ? 's' : ''} answered</span>}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl shadow-inner-sm animate-fade-in overflow-hidden relative">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-red-200/50 to-transparent -mr-2 -mt-2 rounded-full"></div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
               <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="pt-0.5">
              <h3 className="font-bold text-red-900">Validation Error</h3>
              <p className="text-sm text-red-800 font-medium mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Event Summary */}
      <div className="mb-8 p-6 bg-gradient-to-br from-blue-50/80 to-indigo-50/80 rounded-xl border border-blue-200/50 shadow-sm">
        <h3 className="text-2xl font-extrabold text-blue-900 mb-4 tracking-tight drop-shadow-sm">
          {mergedData.event?.name || 'Unnamed Event'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
          <div className="bg-white/60 p-4 rounded-lg shadow-sm border border-blue-100/50">
            <span className="text-blue-700/70 font-bold uppercase tracking-wider text-xs mb-1 block">Start Date</span>
            <p className="font-bold text-gray-900 text-lg flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-blue-500" />
                 {mergedData.event?.start_date || 'Not set'}
            </p>
          </div>
          <div className="bg-white/60 p-4 rounded-lg shadow-sm border border-blue-100/50">
            <span className="text-blue-700/70 font-bold uppercase tracking-wider text-xs mb-1 block">End Date</span>
            <p className="font-bold text-gray-900 text-lg flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-indigo-500" />
                 {mergedData.event?.end_date || 'Same day'}
            </p>
          </div>
          {mergedData.event?.location && (
            <div className="bg-white/60 p-4 rounded-lg shadow-sm border border-blue-100/50 sm:col-span-2 lg:col-span-1">
              <span className="text-blue-700/70 font-bold uppercase tracking-wider text-xs mb-1 block">Location</span>
              <p className="font-bold text-gray-900 text-lg flex items-center gap-2">
                 <MapPin className="w-4 h-4 text-slate-500" />
                 {mergedData.event.location}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Sessions" count={mergedData.sessions?.length || 0} color="blue" />
        <StatCard label="Rooms" count={mergedData.rooms?.length || 0} color="purple" />
        <StatCard label="Speakers" count={mergedData.speakers?.length || 0} color="emerald" />
        <StatCard label="Crises" count={mergedData.crises?.length || 0} color="rose" />
      </div>

      {/* Detailed Data - Expandable Sections */}
      <div className="space-y-4 mb-10">
        <ExpandableSection title="Sessions" count={mergedData.sessions?.length || 0} icon={<Calendar className="w-5 h-5" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {mergedData.sessions?.map((session, i: number) => <SessionCard key={i} session={session} />)}
          </div>
        </ExpandableSection>

        <ExpandableSection title="Speakers" count={mergedData.speakers?.length || 0} icon={<Users className="w-5 h-5" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mergedData.speakers?.map((speaker, i: number) => <SpeakerCard key={i} speaker={speaker} />)}
            </div>
        </ExpandableSection>

        <ExpandableSection title="Rooms" count={mergedData.rooms?.length || 0} icon={<MapPin className="w-5 h-5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mergedData.rooms?.map((room, i: number) => <RoomCard key={i} room={room} />)}
             </div>
        </ExpandableSection>

        {mergedData.crises && mergedData.crises.length > 0 && (
          <ExpandableSection title="Crises Detected" count={mergedData.crises.length} variant="danger" icon={<AlertTriangle className="w-5 h-5" />}>
            <div className="grid grid-cols-1 gap-4">
               {mergedData.crises.map((crisis, i: number) => <CrisisCard key={i} crisis={crisis} />)}
            </div>
          </ExpandableSection>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3.5 border-2 border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors focus:ring-4 focus:ring-gray-100 flex items-center justify-center gap-2 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Back to questions
        </button>
        <button
          onClick={onApply}
          className="flex-[2] px-6 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group"
        >
          <CheckCircle className="w-5 h-5" strokeWidth={3} />
          Confirm & Create Event
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

// --- Helper Functions & Inner UI Components ---

function applyAnswersToData(data: ExtractedData, answers: Record<string, string>, questions: Question[]): ExtractedData {
  // Deep clone to avoid mutating state directly just in case it passes through
  const merged: ExtractedData = JSON.parse(JSON.stringify(data));
  
  for (const [idxStr, answer] of Object.entries(answers)) {
    const question = questions[parseInt(idxStr)];
    if (!question) continue;
    
    const { field, entity_id } = question;
    
    if (field === 'event_name') {
      if(!merged.event) merged.event = {};
      merged.event.name = answer;
    } else if (field === 'event_end_date') {
      if(!merged.event) merged.event = {};
      merged.event.end_date = answer;
    } else if (field === 'speaker_email') {
      const sp = merged.speakers?.find((s) => s.id === entity_id);
      if(sp) sp.email = answer;
    } else if (field === 'speaker_affiliation') {
      const sp = merged.speakers?.find((s) => s.id === entity_id);
      if(sp) sp.affiliation = answer;
    } else if (field === 'session_start_time') {
      const ses = merged.sessions?.find((s) => s.id === entity_id);
      if(ses) ses.start_time = answer;
    } else if (field === 'session_duration') {
      const ses = merged.sessions?.find((s) => s.id === entity_id);
      if(ses) {
        const parsed = parseInt(answer, 10);
        if (!isNaN(parsed)) ses.duration_minutes = parsed;
      }
    }
  }
  return merged;
}

const StatCard = ({ label, count, color }: { label: string, count: number, color: string }) => {
  const styles = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200'
  }[color] || 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col items-center justify-center text-center shadow-sm transition-transform hover:scale-[1.02] ${styles}`}>
       <span className="text-3xl sm:text-4xl font-black mb-1 drop-shadow-sm leading-none">{count}</span>
       <span className="font-bold text-xs sm:text-sm uppercase tracking-wider opacity-80">{label}</span>
    </div>
  );
};

const ExpandableSection = ({ title, count, variant = 'primary', icon, children }: {
  title: string;
  count: number;
  variant?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (count === 0) return null;

  const getVariantStyles = () => {
     if (variant === 'danger') return 'bg-rose-50 border-rose-100 hover:bg-rose-100/50 text-rose-900';
     return 'bg-slate-50 border-slate-200 hover:bg-slate-100/50 text-slate-800';
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all bg-white">
      <button 
         onClick={() => setIsOpen(!isOpen)}
         className={`w-full p-4 flex items-center justify-between transition-colors ${getVariantStyles()}`}
      >
        <div className="flex items-center gap-3">
           <div className={`p-2 rounded-lg ${variant === 'danger' ? 'bg-rose-200/50 text-rose-600' : 'bg-white text-slate-500 shadow-sm border border-slate-100'}`}>
               {icon}
           </div>
           <span className="font-bold text-lg">{title}</span>
           <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${variant === 'danger' ? 'bg-rose-200 text-rose-800' : 'bg-slate-200 text-slate-700'}`}>
               {count}
           </span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 opacity-60" /> : <ChevronDown className="w-5 h-5 opacity-60" />}
      </button>
      
      {isOpen && (
        <div className="p-4 bg-white/50 border-t border-slate-100 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
};

const SessionCard = ({ session }: { session: NonNullable<ExtractedData['sessions']>[number] }) => (
  <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
     <h4 className="font-bold text-slate-900 mb-2 truncate" title={session.title}>{session.title}</h4>
     <div className="space-y-1.5 text-sm">
        <div className="flex justify-between items-center text-slate-600">
           <span className="font-medium text-xs uppercase tracking-wide">Speaker</span>
           <span className="font-semibold text-slate-800">{session.speaker_name || <span className="text-amber-500">Unassigned</span>}</span>
        </div>
        <div className="flex justify-between items-center text-slate-600">
           <span className="font-medium text-xs uppercase tracking-wide">Time</span>
           <span className="font-semibold text-slate-800">{session.start_time || 'TBA'} {session.duration_minutes ? `(${session.duration_minutes}m)` : ''}</span>
        </div>
     </div>
  </div>
);

const SpeakerCard = ({ speaker }: { speaker: NonNullable<ExtractedData['speakers']>[number] }) => (
    <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
       <div className="flex items-center gap-3 mb-2">
           <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-100 to-teal-50 border border-emerald-200 flex items-center justify-center font-bold text-emerald-700">
               {speaker.name?.charAt(0).toUpperCase() || '?'}
           </div>
           <div>
               <h4 className="font-bold text-slate-900 truncate">{speaker.name}</h4>
               <p className="text-xs font-medium text-slate-500 truncate">{speaker.affiliation || 'Independent'}</p>
           </div>
       </div>
       <div className="text-sm font-medium text-slate-600 truncate bg-slate-50 p-2 rounded-md border border-slate-100">
           {speaker.email || <span className="text-amber-500 italic">No email provided</span>}
       </div>
    </div>
);

const RoomCard = ({ room }: { room: NonNullable<ExtractedData['rooms']>[number] }) => (
   <div className="bg-white border rounded-lg p-4 shadow-sm flex items-center justify-between hover:border-purple-200 transition-colors">
       <h4 className="font-bold text-slate-900">{room.name}</h4>
       <div className="px-3 py-1 bg-purple-50 text-purple-700 font-bold border border-purple-100 rounded-full text-xs">
          Cap: {room.capacity || '?'}
       </div>
   </div>
);

const CrisisCard = ({ crisis }: { crisis: NonNullable<ExtractedData['crises']>[number] }) => (
   <div className="bg-white border border-rose-200 rounded-lg p-4 shadow-sm flex items-start gap-3">
       <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
       <div>
           <div className="flex items-center gap-2 mb-1">
               <span className="font-bold text-rose-900 uppercase tracking-wide text-xs bg-rose-100 px-2 py-0.5 rounded">
                 {crisis.type || 'Flagged Issue'}
               </span>
           </div>
           <p className="text-sm text-slate-700 font-medium leading-relaxed">{crisis.description}</p>
       </div>
   </div>
);
