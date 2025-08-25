import { api } from '../lib/api';

export type Curso = {
  id: string;
  nome: string;
  modality: 'ONLINE' | 'PRESENCIAL';
  duracaoHoras?: number | null;
  createdAt: string;
};

export type ListResponse<T> = {
  data: T[];
  total: number;
  page: number;
  perPage: number;
};

export async function listCursos(params: { q?: string; page?: number; perPage?: number } = {}) {
  const { data } = await api.get<ListResponse<Curso>>('/cursos', { params });
  return data;
}

export async function createCurso(payload: { nome: string; modality: 'ONLINE'|'PRESENCIAL'; duracaoHoras?: number | null }) {
  const { data } = await api.post<{ curso: Curso }>('/cursos', payload);
  return data.curso;
}

export async function updateCurso(id: string, payload: Partial<{ nome: string; modality: 'ONLINE'|'PRESENCIAL'; duracaoHoras: number | null }>) {
  const { data } = await api.patch<{ curso: Curso }>(`/cursos/${id}`, payload);
  return data.curso;
}

export async function deleteCurso(id: string) {
  await api.delete(`/cursos/${id}`);
}
