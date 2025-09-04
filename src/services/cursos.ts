/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';

export type Curso = {
  id: string;
  nome: string;
  modality: 'ONLINE' | 'PRESENCIAL';
  duracaoHoras?: number | null;
  createdAt: string;
};

export type FinanceiroDTO = {
  id: string;
  cursoId: string;
  nome: string;
  valorTotal: number;
  numeroParcelas: number;
  diaVencimento?: number | null;
  jurosAoMes?: number | null;
  multaPercent?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ListResponse<T> = {
  data: T[];
  total: number;
  page: number;
  perPage: number;
};

export async function listCursos(params: { q?: string; page?: number; perPage?: number } = {}) {
  const { page = 1, perPage = 10, ...rest } = params;
  const { data } = await api.get<ListResponse<Curso>>('/cursos', {
    params: { page, perPage, ...rest },
  });
  return data;
}

export type CreateCursoPayload = {
  nome: string;
  modality: 'ONLINE' | 'PRESENCIAL';
  duracaoHoras?: number | null;
  financeiro?: {
    nome: string;
    valorTotal: number | string;
    numeroParcelas: number;
    diaVencimento?: number | null;
    jurosAoMes?: number | null;
    multaPercent?: number | null;
  };
};

export async function createCurso(payload: CreateCursoPayload) {
  // API retorna { curso, financeiro? }
  const { data } = await api.post<{ curso: Curso; financeiro?: FinanceiroDTO }>('/cursos', payload);
  return data; // devolve o objeto inteiro para quem quiser usar o financeiro
}

export async function updateCurso(
  id: string,
  payload: Partial<{ nome: string; modality: 'ONLINE'|'PRESENCIAL'; duracaoHoras: number | null }>
) {
  const { data } = await api.patch<{ curso: Curso }>(`/cursos/${id}`, payload);
  return data.curso;
}

export async function deleteCurso(id: string) {
  await api.delete(`/cursos/${id}`);
}

export async function getCursoById(id: string): Promise<Curso> {
  const { data } = await api.get<{ curso: Curso } | Curso>(`/cursos/${id}`);
  return (data as any).curso ?? (data as any);
}
