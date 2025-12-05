
import React, { useRef, useState } from 'react';
import { CreativeAsset } from '../types';

interface VideoRefUploaderProps {
  videoRef: CreativeAsset | null;
  onVideoSet: (asset: CreativeAsset | null) => void;
  cloneVoice: boolean;
  onCloneVoiceChange: (enabled: boolean) => void;
}

export const VideoRefUploader: React.FC<VideoRefUploaderProps> = ({ 
  videoRef, 
  onVideoSet,
  cloneVoice,
  onCloneVoiceChange
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasAudioTrack, setHasAudioTrack] = useState(false);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setHasAudioTrack(false); // Reset

    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.muted = false; // Need unmuted to detect audio tracks properly in some browsers, but we won't play it
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    // Wait for metadata to load to know dimensions, then seek a bit
    video.onloadedmetadata = () => {
      // Simple heuristic for audio track detection simulation
      // In a real app we would check video.mozHasAudio or audioTracks
      setHasAudioTrack(true); 
      video.currentTime = 0.5; // Capture frame at 0.5s
    };

    video.onseeked = () => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
          const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
          const base64 = dataUrl.split(',')[1];

          onVideoSet({
            id: 'video-ref-frame',
            url: dataUrl, // We display the frame as preview
            base64: base64,
            mimeType: 'image/jpeg'
          });
        }
      }
      setIsProcessing(false);
      URL.revokeObjectURL(url);
    };

    video.onerror = () => {
      setIsProcessing(false);
      alert("Erro ao processar o vídeo. Tente outro formato.");
    };
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    onVideoSet(null);
  };

  return (
    <div className="w-full space-y-4">
      <canvas ref={canvasRef} className="hidden" />
      <label className={`
        relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all overflow-hidden group
        ${videoRef 
          ? 'border-neon bg-slate-900 shadow-[0_0_15px_rgba(0,255,255,0.1)]' 
          : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-brand-400'}
      `}>
        
        {videoRef ? (
          <>
            <img src={videoRef.url} alt="Video Frame" className="absolute inset-0 w-full h-full object-cover p-1 rounded-lg opacity-60 group-hover:opacity-30 transition-opacity" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-slate-900/80 border border-neon flex items-center justify-center shadow-[0_0_15px_rgba(0,255,255,0.5)]">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-neon">
                        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>

            <div className="z-10 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-neon font-bold drop-shadow-md mb-2">Substituir Vídeo</span>
                <button 
                  onClick={handleRemove}
                  className="bg-red-500/80 hover:bg-red-600 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md shadow-lg pointer-events-auto"
                >
                  Remover
                </button>
            </div>
            <div className="absolute top-2 left-2 bg-brand-600/90 text-white text-[10px] px-2 py-0.5 rounded-full border border-neon/30 z-10 shadow-lg">
                Referência Capturada
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isProcessing ? (
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon mb-3"></div>
            ) : (
                <svg className="w-10 h-10 mb-3 text-slate-500 group-hover:text-neon transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
            )}
            <p className="mb-1 text-sm text-slate-400 group-hover:text-slate-200 text-center px-4">
              <span className="font-semibold text-brand-300 group-hover:text-neon">
                {isProcessing ? "Processando..." : "Enviar Vídeo da Pessoa"}
              </span>
            </p>
            <p className="text-[10px] text-slate-500 text-center max-w-[200px]">
                O sistema analisará o comportamento e aparência visual
            </p>
          </div>
        )}
        
        <input 
          type="file" 
          className="hidden" 
          accept="video/*"
          onChange={handleFileChange}
          disabled={isProcessing}
        />
      </label>

      {/* Audio Settings Section */}
      {videoRef && (
        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 flex items-center justify-between transition-all hover:border-slate-700">
           <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasAudioTrack ? 'bg-brand-900/50 text-neon' : 'bg-slate-800 text-slate-600'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                 <h4 className="text-sm font-medium text-slate-200">Áudio Original</h4>
                 <div className="flex items-center gap-1 h-3 mt-1">
                    {/* Simulated Waveform */}
                    {[...Array(8)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-1 rounded-full ${hasAudioTrack && cloneVoice ? 'bg-neon animate-pulse-neon' : 'bg-slate-700'}`}
                        style={{ 
                          height: hasAudioTrack && cloneVoice ? `${Math.random() * 10 + 6}px` : '4px',
                          animationDelay: `${i * 0.1}s` 
                        }}
                      />
                    ))}
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-2">
              <span className={`text-xs ${cloneVoice ? 'text-neon font-medium' : 'text-slate-500'}`}>
                {cloneVoice ? 'Voz Clonada' : 'Voz Padrão'}
              </span>
              <button 
                onClick={() => onCloneVoiceChange(!cloneVoice)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-neon focus:ring-offset-2 focus:ring-offset-slate-900
                  ${cloneVoice ? 'bg-brand-600' : 'bg-slate-700'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${cloneVoice ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
           </div>
        </div>
      )}
    </div>
  );
};
