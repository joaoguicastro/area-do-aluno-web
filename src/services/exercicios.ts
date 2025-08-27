/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';
import type { ListResponse } from './cursos';

export type Exercicio = {
  id: string;
  cursoId: string;
  titulo: string;
  descricao?: string | null;
  dataEntrega?: string | null; // ISO yyyy-mm-dd
  publicado: boolean;
  createdAt: string;

  // opcionais se o back enviar
  cursoNome?: string | null;
};

export type CreateExercicioPayload = {
  cursoId: string;
  titulo: string;
  descricao?: string | null;
  dataEntrega?: string | null; // yyyy-mm-dd
  publicado?: boolean;         // default false
};

export type Entrega = {
  id: string;
  exercicioId: string;
  alunoId: string;
  url?: string | null;
  observacoes?: string | null;
  nota?: number | null;
  createdAt: string;

  // auxiliares
  alunoNome?: string | null;
  alunoMatricula?: string | null;
};

export async function listExercicios(params: { q?: string; page?: number; perPage?: number; cursoId?: string } = {}) {
  const { data } = await api.get<ListResponse<Exercicio>>('/exercicios', { params });
  return data;
}

export async function createExercicio(payload: CreateExercicioPayload) {
  const { data } = await api.post<{ exercicio: Exercicio }>('/exercicios', payload);
  return data.exercicio;
}

export async function publishExercicio(id: string) {
  const { data } = await api.patch<{ exercicio: Exercicio }>(`/exercicios/${id}/publicar`, {});
  return data.exercicio;
}

export async function listEntregas(exercicioId: string, params: { page?: number; perPage?: number } = {}) {
  const { data } = await api.get<ListResponse<Entrega>>(`/exercicios/${exercicioId}/entregas`, { params });
  return data;
}

// para uso na área do aluno (entrega)
export async function submitEntrega(
  exercicioId: string,
  payload: { url?: string | null; observacoes?: string | null }
) {
  const { data } = await api.post<{ entrega: Entrega }>(`/exercicios/${exercicioId}/entregas`, payload);
  return data.entrega;
}
