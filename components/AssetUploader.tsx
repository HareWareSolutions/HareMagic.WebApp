
import React, { useCallback } from 'react';
import { CreativeAsset } from '../types';

interface AssetUploaderProps {
  onAssetsAdded: (assets: CreativeAsset[]) => void;
}

export const AssetUploader: React.FC<AssetUploaderProps> = ({ onAssetsAdded }) => {
  
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Fix: Cast Array.from result to File[] to ensure 'file' is typed correctly as File instead of unknown
    const newAssets: Promise<CreativeAsset>[] = (Array.from(files) as File[]).map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Extract base64 content
          const base64 = result.split(',')[1];
          resolve({
            id: Math.random().toString(36).substring(7),
            url: result, // For preview
            base64: base64, // For API
            mimeType: file.type
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newAssets).then((assets) => {
      onAssetsAdded(assets);
      // Reset input
      event.target.value = '';
    });
  }, [onAssetsAdded]);

  return (
    <div className="w-full">
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-800 hover:border-neon transition-all group shadow-inner">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg className="w-8 h-8 mb-4 text-slate-400 group-hover:text-neon transition-colors group-hover:drop-shadow-[0_0_8px_rgba(0,255,255,0.6)]" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
          </svg>
          <p className="mb-2 text-sm text-slate-400 group-hover:text-slate-200"><span className="font-semibold text-brand-300 group-hover:text-neon">Clique para enviar</span> imagens</p>
          <p className="text-xs text-slate-500">PNG ou JPG (Max. 5MB)</p>
        </div>
        <input 
          type="file" 
          className="hidden" 
          multiple 
          accept="image/*"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
};
