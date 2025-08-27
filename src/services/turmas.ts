/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';
import type { ListResponse } from './cursos'; // reaproveita o tipo de paginação

export type Turma = {
  id: string;
  nome: string;
  cursoId: string;
  cursoNome?: string | null;
  dataInicio?: string | null; // ISO
  dataFim?: string | null;    // ISO
  createdAt: string;
};


export async function listTurmas(params: { q?: string; page?: number; perPage?: number } = {}) {
  const { data } = await api.get<ListResponse<Turma>>('/turmas', { params });
  return data;
}

export async function getTurmaById(id: string): Promise<Turma> {
  const { data } = await api.get<{ turma: Turma }>(`/turmas/${id}`);
  return data.turma;
}


export async function createTurma(payload: {
  nome: string;
  cursoId: string;
  dataInicio?: string | null; // ISO 'YYYY-MM-DD'
  dataFim?: string | null;    // ISO
}) {
  const { data } = await api.post<{ turma: Turma }>('/turmas', payload);
  return data.turma;
}

export async function updateTurma(
  id: string,
  payload: Partial<{ nome: string; cursoId: string; dataInicio: string | null; dataFim: string | null }>
) {
  const { data } = await api.patch<{ turma: Turma }>(`/turmas/${id}`, payload);
  return data.turma;
}

export async function deleteTurma(id: string) {
  await api.delete(`/turmas/${id}`);
}

export async function listTurmasByCursoId(cursoId: string): Promise<Turma[]> {
  const { data } = await api.get<any>(`/turmas/curso/${cursoId}`);
  const arr: Turma[] =
    data?.data ??
    data?.turmas ??
    (data?.turma ? [data.turma] : []);
  return arr ?? [];
}
