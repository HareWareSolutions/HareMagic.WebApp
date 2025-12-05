
import React from 'react';
import { AspectRatio } from '../types';

interface RatioSelectorProps {
  selectedRatio: AspectRatio;
  onChange: (ratio: AspectRatio) => void;
}

export const RatioSelector: React.FC<RatioSelectorProps> = ({ selectedRatio, onChange }) => {
  
  const options = [
    { val: AspectRatio.SQUARE, label: '1:1', desc: 'Quadrado' },
    { val: AspectRatio.PORTRAIT, label: '4:5', desc: 'Feed Retrato' },
    { val: AspectRatio.STORY, label: '9:16', desc: 'Story/Reels' }
  ];

  return (
    <div className="flex space-x-3 w-full">
      {options.map((option) => (
        <button
          key={option.val}
          onClick={() => onChange(option.val)}
          className={`
            flex-1 flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200
            ${selectedRatio === option.val 
              ? 'bg-brand-900/60 border-neon text-neon shadow-[0_0_15px_rgba(0,255,255,0.2)]' 
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750 hover:border-slate-500'}
          `}
        >
          <div className={`
            border-2 mb-2 rounded-sm transition-colors
            ${selectedRatio === option.val ? 'border-neon bg-neon/20' : 'border-slate-500'}
          `}
          style={{
             width: '24px',
             height: option.val === AspectRatio.SQUARE ? '24px' : (option.val === AspectRatio.STORY ? '42px' : '30px')
          }}
          ></div>
          <span className="text-sm font-medium">{option.label}</span>
          <span className="text-[10px] opacity-70">{option.desc}</span>
        </button>
      ))}
    </div>
  );
};
