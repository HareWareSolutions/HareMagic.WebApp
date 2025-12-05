
import React, { useState, useEffect } from 'react';
import { AssetUploader } from './components/AssetUploader';
import { ProductUploader } from './components/ProductUploader';
import { Gallery } from './components/Gallery';
import { RatioSelector } from './components/RatioSelector';
import { AspectRatio, CreativeAsset, GenerationState, UserProfile } from './types';
import { generateBrandPost } from './services/geminiService';
import { dbService, PLANS } from './services/dbService';
import { Login } from './components/Login';
import { SYSTEM_LOGO_URL, APP_NAME } from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // State
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [productImage, setProductImage] = useState<CreativeAsset | null>(null);
  const [prompt, setPrompt] = useState<string>('');

  const [ratio, setRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    resultImage: null,
    error: null,
    progress: ''
  });

  const handleAssetsAdded = (newAssets: CreativeAsset[]) => {
    setAssets((prev) => [...prev, ...newAssets]);
  };

  const handleRemoveAsset = (id: string) => {
    setAssets((prev) => prev.filter(a => a.id !== id));
  };

  const refreshUserData = async () => {
    if (currentUser) {
      const updated = await dbService.getUser(currentUser.email);
      setCurrentUser(updated);
    }
  };

  const handleGenerate = async () => {
    if (!currentUser) return;

    setGenerationState({ isGenerating: true, resultImage: null, error: null, progress: 'Verificando plano...' });

    try {
      // 1. Validar Inputs
      if (assets.length === 0 && !productImage) {
        throw new Error("Adicione pelo menos uma imagem de identidade visual ou um produto.");
      }
      if (!prompt.trim()) throw new Error("Adicione uma instrução no prompt.");
      if (assets.length === 0) throw new Error("Adicione referências de estilo para ensinar a IA.");

      // 2. Verificar Cota no Banco de Dados
      const canGenerate = await dbService.canGenerate(currentUser.email);
      if (!canGenerate) {
        throw new Error(`Limite mensal do plano ${PLANS[currentUser.plan].name} atingido.`);
      }

      setGenerationState(s => ({ ...s, progress: 'Analisando estilo e gerando imagem...' }));

      // 3. Gerar Imagem
      const resultUrl = await generateBrandPost(assets, productImage, prompt, ratio);

      // 4. Consumir Crédito no Banco de Dados (Sucesso)
      const updatedUser = await dbService.incrementUsage(currentUser.email);
      setCurrentUser(updatedUser);

      setGenerationState({ isGenerating: false, resultImage: resultUrl, error: null });

    } catch (e: any) {
      setGenerationState({
        isGenerating: false,
        resultImage: null,
        error: e.message || "Erro ao gerar. Tente novamente."
      });
    }
  };

  if (!currentUser) {
    return <Login onLogin={(user) => setCurrentUser(user)} />;
  }

  const currentPlan = PLANS[currentUser.plan];
  const usagePercentage = Math.min((currentUser.generationsUsed / currentPlan.limit) * 100, 100);
  const isLimitReached = currentUser.generationsUsed >= currentPlan.limit;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-neon selection:text-brand-900 pb-20">
      {/* Header */}
      <header className="border-b border-brand-900/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 shadow-[0_4px_20px_rgba(0,76,153,0.2)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={SYSTEM_LOGO_URL}
              alt={`${APP_NAME} Logo`}
              className="w-7 h-7 object-contain"
            />
            <h1 className="text-xl font-bold text-white tracking-tight flex gap-1">
              Hare<span className="text-neon-glow">Magic</span>
            </h1>
          </div>
          <div className="flex items-center gap-6">
            {/* Plan Usage Display */}
            <div className="hidden md:flex flex-col items-end min-w-[140px]">
              <div className="flex items-center justify-between w-full text-xs mb-1">
                <span className="text-slate-400">Plano <strong className="text-brand-300 uppercase">{currentPlan.name}</strong></span>
                <span className={`${isLimitReached ? 'text-red-400 font-bold' : 'text-neon'}`}>
                  {currentUser.generationsUsed}/{currentPlan.limit}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${isLimitReached ? 'bg-red-500' : 'bg-neon shadow-[0_0_10px_#00FFFF]'}`}
                  style={{ width: `${usagePercentage}%` }}
                ></div>
              </div>
            </div>

            <div className="h-8 w-[1px] bg-slate-800 mx-2 hidden md:block"></div>

            <button
              onClick={() => setCurrentUser(null)}
              className="text-sm text-slate-400 hover:text-neon transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Mobile Plan Usage (Visible only on small screens) */}
        <div className="md:hidden mb-6 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between w-full text-xs mb-2">
            <span className="text-slate-400">Plano <strong className="text-brand-300">{currentPlan.name}</strong></span>
            <span className={`${isLimitReached ? 'text-red-400' : 'text-neon'}`}>
              {currentUser.generationsUsed}/{currentPlan.limit} gerações
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${isLimitReached ? 'bg-red-500' : 'bg-neon'}`}
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">

          {/* Left Column: Configuration */}
          <div className="lg:col-span-5 space-y-6">

            {/* Step 1: Assets (Images) */}
            <section className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold border border-neon shadow-[0_0_10px_rgba(0,255,255,0.4)]">1</div>
                <h2 className="font-semibold text-lg text-slate-100">Identidade Visual</h2>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                Envie imagens (logos, posts antigos, paleta) que representam o estilo da marca.
              </p>
              <AssetUploader onAssetsAdded={handleAssetsAdded} />
              <div className="mt-4">
                <Gallery assets={assets} onRemove={handleRemoveAsset} />
              </div>
            </section>

            {/* Step 2: Product (Images) */}
            <section className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold border border-slate-500">2</div>
                <h2 className="font-semibold text-lg text-slate-100">Produto (Opcional)</h2>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                O objeto principal a ser inserido na cena (packshot sem fundo preferencialmente).
              </p>
              <ProductUploader productImage={productImage} onProductSet={setProductImage} />
            </section>

            {/* Step 3: Prompt & Ratio */}
            <section className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-neon/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold border border-neon shadow-[0_0_10px_rgba(0,255,255,0.4)]">3</div>
                <h2 className="font-semibold text-lg text-slate-100">Instruções e Formato</h2>
              </div>

              <div className="space-y-4 relative z-10">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Descrição do Post
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ex: Um post anunciando a promoção de verão com iluminação suave, fundo minimalista e texto chamativo..."
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-neon focus:border-neon outline-none resize-none h-32 text-sm leading-relaxed transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Formato</label>
                  <RatioSelector selectedRatio={ratio} onChange={setRatio} />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={generationState.isGenerating || assets.length === 0 || isLimitReached}
                  className={`
                    w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg transition-all duration-300 relative overflow-hidden group
                    ${generationState.isGenerating
                      ? 'bg-slate-800 cursor-not-allowed opacity-80'
                      : (assets.length === 0 || isLimitReached)
                        ? 'bg-slate-800 cursor-not-allowed text-slate-500'
                        : 'bg-brand-600 hover:bg-brand-700 border border-neon/50 shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:shadow-[0_0_30px_rgba(0,255,255,0.4)] hover:-translate-y-0.5'
                    }
                  `}
                >
                  {!generationState.isGenerating && !isLimitReached && (
                    <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shiny" />
                  )}

                  {generationState.isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-neon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-neon">Criando Magia...</span>
                    </span>
                  ) : isLimitReached ? (
                    <span className="flex items-center justify-center gap-2 text-red-400">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      Limite do Plano Atingido
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-neon">
                        <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436h.008c.642.642 1.664.642 2.306 0a.75.75 0 011.06 1.06c-1.226 1.226-3.22 1.226-4.446 0a.75.75 0 010-1.06c.642-.642.642-1.664 0-2.306-.607-.607-1.127-1.32-1.528-2.102a.75.75 0 011.396-.546 9.427 9.427 0 00.916 1.258c3.083-2.398 5.087-6.143 5.087-10.43-4.287 0-8.032 2.004-10.43 5.087-.19.245-.376.5-.558.761a.75.75 0 11-1.238-.853c.22-.315.45-.62.686-.913zm-3.692 8.56c.654-.606 1.637-.62 2.306-.05.67.57.778 1.57.24 2.238l-4.237 5.253a.75.75 0 01-1.115.06l-2.063-2.064a.75.75 0 01.06-1.115l4.809-4.322z" clipRule="evenodd" />
                      </svg>
                      {`Gerar Post ${productImage ? 'com Produto' : ''}`}
                    </span>
                  )}
                </button>
                {generationState.error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center">
                    {generationState.error}
                  </div>
                )}
                {generationState.progress && generationState.isGenerating && (
                  <div className="text-center text-xs text-neon animate-pulse">
                    {generationState.progress}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Preview */}
          <div className="lg:col-span-7 h-full flex flex-col">
            <section className="bg-slate-900/50 rounded-2xl border border-slate-800 shadow-xl h-full min-h-[500px] flex flex-col p-2 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-600 to-transparent opacity-80 shadow-[0_0_10px_#004C99]"></div>

              {/* Canvas Area */}
              <div className="flex-1 rounded-xl bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-slate-950 flex items-center justify-center p-8 relative">

                {/* EMPTY STATE */}
                {!generationState.resultImage && !generationState.isGenerating && (
                  <div className="text-center space-y-4 max-w-sm">
                    <div className="w-20 h-20 bg-slate-900 rounded-full mx-auto flex items-center justify-center border border-slate-800 shadow-inner group">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-slate-600 group-hover:text-neon transition-colors duration-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                    </div>
                    <h3 className="text-slate-300 font-medium">
                      Estúdio de Criação
                    </h3>
                    <p className="text-slate-500 text-sm">
                      Configure a identidade da marca, adicione um produto e crie posts incríveis em segundos.
                    </p>
                    <div className="pt-2">
                      <p className="text-xs text-slate-600">
                        Plano Atual: <span className="text-brand-300">{currentPlan.name}</span>
                        <br />
                        Créditos restantes: {currentPlan.limit - currentUser.generationsUsed}
                      </p>
                    </div>
                  </div>
                )}

                {/* LOADING STATE */}
                {generationState.isGenerating && (
                  <div className="text-center space-y-6 animate-pulse">
                    <div className="relative w-32 h-32 mx-auto">
                      <div className="absolute inset-0 bg-brand-600 rounded-full opacity-20 blur-xl animate-pulse"></div>
                      <div className="relative w-full h-full border-4 border-brand-600/30 border-t-neon rounded-full animate-spin"></div>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-neon">
                        Gerando Arte...
                      </p>
                      <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                        {generationState.progress || "A inteligência artificial está trabalhando nos detalhes..."}
                      </p>
                    </div>
                  </div>
                )}

                {/* RESULT IMAGE */}
                {generationState.resultImage && !generationState.isGenerating && (
                  <div className="relative group shadow-[0_0_50px_rgba(0,76,153,0.3)] transition-transform duration-500 ease-out hover:scale-[1.01]">
                    <img
                      src={generationState.resultImage}
                      alt="Generated Post"
                      className="max-h-[70vh] w-auto rounded-lg object-contain border border-brand-800"
                    />
                    <div className="absolute -bottom-14 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <a
                        href={generationState.resultImage}
                        download="haremagic-post.png"
                        className="bg-brand-600 hover:bg-brand-500 text-white border border-neon/50 px-6 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(0,255,255,0.4)] transition-all flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l15 15m0 0l-3.75-3.75M12 2.25v13.5" />
                        </svg>
                        Baixar Imagem
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
