
import React, { useCallback } from 'react';
import { CreativeAsset } from '../types';

interface ProductUploaderProps {
  productImage: CreativeAsset | null;
  onProductSet: (asset: CreativeAsset | null) => void;
}

export const ProductUploader: React.FC<ProductUploaderProps> = ({ productImage, onProductSet }) => {
  
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      
      onProductSet({
        id: 'product-img',
        url: result,
        base64: base64,
        mimeType: file.type
      });
      
      // Reset input value to allow re-uploading same file if deleted
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  }, [onProductSet]);

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onProductSet(null);
  };

  return (
    <div className="w-full">
      <label className={`
        relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all overflow-hidden group
        ${productImage 
          ? 'border-neon bg-slate-900 shadow-[0_0_15px_rgba(0,255,255,0.1)]' 
          : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-brand-400'}
      `}>
        
        {productImage ? (
          <>
            <img src={productImage.url} alt="Product" className="absolute inset-0 w-full h-full object-contain p-2 z-0 opacity-80 group-hover:opacity-40 transition-opacity" />
            <div className="z-10 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-neon font-bold drop-shadow-md mb-2">Trocar Imagem</span>
                <button 
                  onClick={handleRemove}
                  className="bg-red-500/80 hover:bg-red-600 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md shadow-lg"
                >
                  Remover Produto
                </button>
            </div>
            <div className="absolute top-2 right-2 bg-brand-600/90 text-white text-[10px] px-2 py-0.5 rounded-full border border-neon/30 z-10 shadow-lg">
                Produto Ativo
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg className="w-8 h-8 mb-3 text-slate-500 group-hover:text-neon transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <p className="mb-1 text-sm text-slate-400 group-hover:text-slate-200 text-center px-4">
              <span className="font-semibold text-brand-300 group-hover:text-neon">Adicionar Produto</span>
            </p>
            <p className="text-[10px] text-slate-500 text-center">(Opcional) O objeto a ser inserido</p>
          </div>
        )}
        
        <input 
          type="file" 
          className="hidden" 
          accept="image/*"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
};
