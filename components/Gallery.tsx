import React from 'react';
import { CreativeAsset } from '../types';

interface GalleryProps {
  assets: CreativeAsset[];
  onRemove: (id: string) => void;
}

export const Gallery: React.FC<GalleryProps> = ({ assets, onRemove }) => {
  if (assets.length === 0) {
    return (
      <div className="text-center py-10 bg-slate-800/30 rounded-lg border border-slate-800/50">
        <p className="text-slate-500 text-sm">Nenhum criativo carregado ainda.</p>
        <p className="text-slate-600 text-xs mt-1">Carregue imagens para ensinar a identidade visual.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 mt-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
      {assets.map((asset) => (
        <div key={asset.id} className="relative group aspect-square rounded-md overflow-hidden bg-slate-900 border border-slate-700">
          <img src={asset.url} alt="reference" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
          <button
            onClick={() => onRemove(asset.id)}
            className="absolute top-1 right-1 bg-black/60 hover:bg-red-500/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};
