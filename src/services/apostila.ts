import { api } from "./api";

export type Apostila = {
  id: string;
  cursoId: string;
  titulo: string;
  urlPdf: string;
  createdAt: string;
};
export type CreateApostilaPayload = {
  cursoId: string;
  titulo: string;
  urlPdf: string;
};

type ListResponse<T> = { data: T[]; total: number; page: number; perPage: number } | T[];

export async function listApostilas(params: { q?: string; page?: number; perPage?: number; cursoId?: string } = {}) {
  const { cursoId, ...rest } = params;

  if (cursoId) {
    const { data } = await api.get<Apostila[]>(`/cursos/${cursoId}/apostilas`, { params: rest });
    return { data, total: data.length, page: 1, perPage: data.length };
  }

  const { data } = await api.get<ListResponse<Apostila>>('/apostilas', { params: rest });
  return Array.isArray(data)
    ? { data, total: data.length, page: 1, perPage: data.length }
    : data;
}


export async function createApostila(payload: CreateApostilaPayload) {
  const { data } = await api.post<{ apostila: Apostila }>('/apostilas', payload);
  return data.apostila;
}

export async function deleteApostila(id: string) {
  await api.delete(`/apostilas/${id}`);
}

export async function getApostilaById(id: string) {
  const { data } = await api.get<{ apostila: Apostila }>(`/apostilas/${id}`);
  return data.apostila;
}