import React from 'react';
import { EVENT_TEMPLATES, EventTemplate } from '../data/eventTemplates';

interface TemplateSelectorProps {
  onSelect: (text: string) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelect }) => {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        Quick-Start Templates
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {EVENT_TEMPLATES.map((template: EventTemplate) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.text)}
            className="group flex flex-col items-start gap-1 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-300"
            title={template.description}
          >
            <span className="text-xl leading-none">{template.icon}</span>
            <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700 leading-tight">
              {template.name}
            </span>
            <span className="text-[10px] text-slate-400 group-hover:text-blue-500 leading-snug line-clamp-2 hidden sm:block">
              {template.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
