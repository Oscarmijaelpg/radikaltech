import React from 'react';
import { Icon } from '@radikal/ui';

interface Idea {
  title: string;
  description: string;
  platform: string;
  type: string;
}

interface IdeaCardProps {
  idea: Idea;
  onClick: () => void;
}

export const IdeaCard: React.FC<IdeaCardProps> = ({ idea, onClick }) => {
  const renderDescription = (text: string) => {
    const parts = text.split(/(Qué:|Por qué:)/gi);
    return parts.map((part, i) => {
      const lowPart = part.toLowerCase().trim();
      if (lowPart === 'qué:' || lowPart === 'por qué:') {
        return (
          <strong key={i} className="text-slate-900 font-black mr-1 block mt-2 mb-1">
            {part}
          </strong>
        );
      }
      return (
        <span key={i} className="text-slate-600 leading-relaxed">
          {part}
        </span>
      );
    });
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:shadow-[0_40px_80px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden flex flex-col"
    >
      {/* Platform Tag */}
      <div className="flex items-center justify-between mb-6">
        <span className="px-4 py-1.5 rounded-full bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em]">
          {idea.platform}
        </span>
        <Icon
          name="arrow_forward_ios"
          className="text-slate-300 group-hover:text-indigo-500 transition-colors text-2xl"
        />
      </div>

      <h4 className="text-xl font-black text-slate-900 mb-4 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
        {idea.title}
      </h4>

      <div className="text-sm flex-1">{renderDescription(idea.description)}</div>

      <div className="mt-8 pt-6 border-t border-slate-50 flex items-center gap-3">
        <div
          className={`w-2 h-2 rounded-full ${
            idea.type === 'carrusel' ? 'bg-amber-400 animate-pulse' : 'bg-indigo-400'
          }`}
        ></div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Formato: {idea.type}
        </span>
      </div>
    </div>
  );
};
