/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';
import type { ListResponse } from './cursos';

export type Matricula = {
  id: string;
  alunoId: string;
  cursoId: string;
  turmaId: string;
  status: 'ATIVA' | 'TRANCADA' | 'CANCELADA' | 'CONCLUIDA';
  dataInicio?: string | null;
  dataFim?: string | null;

  curso?: { id: string; nome: string; modality: 'ONLINE' | 'PRESENCIAL' } | null;

  alunoNome?: string | null;
  cursoNome?: string | null;
  turmaNome?: string | null;
};

export async function listMatriculasAtivasDoAluno(alunoId: string) {
  const { data } = await api.get<{
    data: Matricula[];
    total: number;
    page: number;
    perPage: number;
  }>('/matriculas', { params: { alunoId, status: 'ATIVA', page: 1, perPage: 50 } });
  return data.data;
}

export type MatriculaStatus = 'ATIVA' | 'TRANCADA' | 'CANCELADA' | 'CONCLUIDA';

export type CreateMatriculaPayload = {
  alunoId: string;
  cursoId: string;
  turmaId?: string | null;
  status?: MatriculaStatus;   // default ATIVA
  dataInicio?: string | null; // 'YYYY-MM-DD'
  dataFim?: string | null;    // 'YYYY-MM-DD'
};

export async function listMatriculas(params: { q?: string; page?: number; perPage?: number } = {}) {
  const { data } = await api.get<ListResponse<Matricula>>('/matriculas', { params });
  return data;
}

export async function createMatricula(payload: CreateMatriculaPayload) {
  const { data } = await api.post<{ matricula: Matricula }>('/matriculas', payload);
  return data.matricula;
}

export async function updateMatricula(id: string, payload: Partial<CreateMatriculaPayload>) {
  const { data } = await api.patch<{ matricula: Matricula }>(`/matriculas/${id}`, payload);
  return data.matricula;
}

export async function deleteMatricula(id: string) {
  await api.delete(`/matriculas/${id}`);
}

/* ---------------------- Financeiro / Parcelas ---------------------- */

export type StatusParcela = 'ABERTA' | 'PAGA' | 'ESTORNADA';
export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'BOLETO';

export type Parcela = {
  id: string;
  matriculaId: string;
  numero: number;           // 1..N
  valor: number;            // mapeado pelo back pra number
  vencimento: string;       // ISO
  status: StatusParcela;
  formaPagamento?: FormaPagamento | null;
  pagoEm?: string | null;
  valorPago?: number | null;
  createdAt: string;
  updatedAt: string;
};

export async function listParcelasByMatricula(matriculaId: string) {
  const { data } = await api.get<Parcela[]>(`/matriculas/${matriculaId}/parcelas`);
  return data;
}

export async function baixaParcela(id: string, payload: { formaPagamento: FormaPagamento; valorPago: number; pagoEm?: string }) {
  const { data } = await api.patch<Parcela>(`/parcelas/${id}/baixa`, payload);
  return data;
}

export async function estornarParcela(id: string) {
  const { data } = await api.patch<Parcela>(`/parcelas/${id}/estorno`, {});
  return data;
}
