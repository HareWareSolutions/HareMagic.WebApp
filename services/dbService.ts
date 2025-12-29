
import { PlanTier, UserProfile, PlanConfig } from "../types";

// Configuração dos Planos (Regra de Negócio)
export const PLANS: Record<PlanTier, PlanConfig> = {
  talisma: { id: 'talisma', name: 'Talismã', limit: 5 },
  encantamento: { id: 'encantamento', name: 'Encantamento', limit: 20 },
  conjurador: { id: 'conjurador', name: 'Conjurador', limit: 50 },
  oraculo: { id: 'oraculo', name: 'Oráculo', limit: 100 },
};

export const dbService = {
  // Login
  login: async (email: string, password: string): Promise<UserProfile> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login falhou.');
    }

    return response.json();
  },

  // Register
  register: async (email: string, password: string): Promise<UserProfile> => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Cadastro falhou.');
    }

    return response.json();
  },

  // Busca usuário atualizado
  getUser: async (email: string): Promise<UserProfile> => {
    const response = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    return response.json();
  },

  // Chamado antes de gerar: Verifica se tem saldo
  canGenerate: async (email: string): Promise<boolean> => {
    try {
      const user = await dbService.getUser(email);
      const limit = PLANS[user.plan].limit;
      return user.generationsUsed < limit;
    } catch (e) {
      console.error("Error checking quota:", e);
      return false;
    }
  },

  // Chamado após gerar com sucesso: Incrementa contador
  incrementUsage: async (email: string): Promise<UserProfile> => {
    const response = await fetch('/api/usage/increment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      throw new Error('Failed to increment usage');
    }

    return response.json();
  },

  getPlanDetails: (planId: PlanTier): PlanConfig => {
    return PLANS[planId];
  }
};
