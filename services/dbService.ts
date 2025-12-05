
import { PlanTier, UserProfile, PlanConfig } from "../types";

// Configuração dos Planos (Regra de Negócio)
export const PLANS: Record<PlanTier, PlanConfig> = {
  talisma: { id: 'talisma', name: 'Talismã', limit: 3 },
  encantamento: { id: 'encantamento', name: 'Encantamento', limit: 20 },
  conjurador: { id: 'conjurador', name: 'Conjurador', limit: 50 },
  oraculo: { id: 'oraculo', name: 'Oráculo', limit: 100 },
};

export const dbService = {
  // Chamado no Login: Busca ou Cria usuário e aplica a regra de data
  getUser: async (email: string, defaultPlan: PlanTier = 'talisma'): Promise<UserProfile> => {
    const response = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, defaultPlan })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    return response.json();
  },

  // Chamado antes de gerar: Verifica se tem saldo
  // Note: This is now a check based on the last known state or a fresh fetch. 
  // To be safe, we should probably fetch, but for UI responsiveness we might rely on local state 
  // or do a quick fetch. Let's do a fetch to be accurate.
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
