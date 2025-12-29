import React, { useState } from 'react';
import { SYSTEM_LOGO_URL, APP_NAME } from '../constants';
import { dbService } from '../services/dbService';
import { UserProfile } from '../types';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        const user = await dbService.register(email, password);
        onLogin(user);
      } else {
        const user = await dbService.login(email, password);
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-brand-600/20 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-neon/10 blur-[80px]"></div>
      </div>

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10 transition-all duration-300">
        <div className="flex flex-col items-center mb-8">
          <img
            src={SYSTEM_LOGO_URL}
            alt={`${APP_NAME} Logo`}
            className="w-24 h-24 object-contain drop-shadow-md"
          />
          <h1 className="text-3xl font-bold text-white tracking-tight">Hare<span className="text-neon-glow">Magic</span></h1>
          <p className="text-slate-400 mt-2 text-center text-sm">
            {isRegistering ? 'Crie sua conta e comece a criar' : 'Inteligência Artificial para sua marca'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center animate-pulse">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              required
              placeholder="seu@email.com"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-600 focus:ring-2 focus:ring-neon focus:border-neon outline-none transition-all shadow-inner"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-300 ml-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              required
              placeholder="••••••••"
              minLength={6}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-slate-100 placeholder-slate-600 focus:ring-2 focus:ring-neon focus:border-neon outline-none transition-all shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-xl border border-neon/50 shadow-[0_0_20px_rgba(0,255,255,0.25)] hover:shadow-[0_0_30px_rgba(0,255,255,0.4)] transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-neon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processando...</span>
              </>
            ) : (
              <span>{isRegistering ? 'Criar Conta Grátis' : 'Entrar na Plataforma'}</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            {isRegistering ? 'Já tem uma conta?' : 'Ainda não tem acesso?'}
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
                setEmail('');
                setPassword('');
              }}
              className="ml-2 text-neon hover:text-brand-300 font-medium transition-colors hover:underline"
            >
              {isRegistering ? 'Fazer Login' : 'Criar Conta'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
