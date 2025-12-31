
import { PlanTier, UserProfile, PlanConfig } from "../types";

// Configuração dos Planos (Regra de Negócio)
export const PLANS: Record<PlanTier, PlanConfig> = {
  talisma: { id: 'talisma', name: 'Talismã', limit: 5 },
  encantamento: { id: 'encantamento', name: 'Encantamento', limit: 20 },
  conjurador: { id: 'conjurador', name: 'Conjurador', limit: 50 },
  oraculo: { id: 'oraculo', name: 'Oráculo', limit: 100 },
};

// Helper para tratar respostas
const handleResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type");

  // Verifica se é JSON
  if (contentType && contentType.includes("application/json")) {
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro na requisição.');
    }

    return data;
  } else {
    // Se não for JSON, provavelmente é um erro de servidor ou proxy (HTML)
    const text = await response.text();
    console.error("Non-JSON response:", text.substring(0, 200)); // Log parcial para debug
    throw new Error(`Erro de conexão com o servidor. (Status: ${response.status})`);
  }
};

export const dbService = {
  // Login
  login: async (email: string, password: string): Promise<UserProfile> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(response);
  },

  // Register
  register: async (email: string, password: string): Promise<UserProfile> => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(response);
  },

  // Busca usuário atualizado
  getUser: async (email: string): Promise<UserProfile> => {
    const response = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    // fetch only throws on network failure, checks status inside handleResponse
    try {
      return await handleResponse(response);
    } catch (e) {
      throw new Error('Failed to fetch user');
    }
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

    try {
      return await handleResponse(response);
    } catch (e) {
      throw new Error('Failed to increment usage');
    }
  },

  getPlanDetails: (planId: PlanTier): PlanConfig => {
    return PLANS[planId];
  }
};
