/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';

export type ParcelaView = {
  id: string;
  matriculaId: string;
  cursoId: string;
  cursoNome: string;
  numero: number;
  valor: number;
  vencimento: string; // ISO
  status: 'ABERTA' | 'PAGA' | string;
  diasAtraso: number;
};

export type FinanceGate = {
  requireFinance: boolean;
  vencidas?: number;
  detalhes?: Array<{
    id: string; numero: number; vencimento: string; valor: number; diasAtraso: number;
  }>;
};

export async function getFinanceGate(): Promise<FinanceGate> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const { data } = await api.get<FinanceGate>('/me/financeiro/gate', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return data;
}


export async function listMinhasParcelas() {
  const { data } = await api.get<{ data: ParcelaView[]; resumo: any }>('/me/financeiro/parcelas');
  return data;
}

// stub para futuro checkout
export async function criarIntentPagamento(parcelaId: string) {
  // ainda não implementado no back
  return { ok: false as const, message: 'Em breve' };
}
