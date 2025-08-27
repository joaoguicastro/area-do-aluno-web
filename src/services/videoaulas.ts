// src/services/videoaulas.ts
import { api } from '../lib/api'; // <- seu axios/fetch wrapper

export type VideoAula = {
  id: string;
  cursoId: string;
  titulo: string;
  descricao?: string;
  urlVideo: string;
  ordem?: number;
  duracaoMin?: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateVideoAulaInput = {
  titulo: string;
  descricao?: string | null;
  urlVideo: string;
  ordem?: number | null;
  duracaoMin?: number | null;
};

// POST /cursos/:cursoId/videoaulas
export async function addVideoAula(cursoId: string, payload: CreateVideoAulaInput) {
  const { data } = await api.post<{ video: VideoAula }>(`/cursos/${cursoId}/videoaulas`, payload);
  return data;
}

// GET /cursos/:cursoId/videoaulas
export async function listVideoAulas(cursoId: string): Promise<{ data: VideoAula[] }> {
  const res = await api.get(`/cursos/${cursoId}/videoaulas`);
  const payload = res.data;
  const data = payload?.data ?? payload?.videos ?? [];
  return { data };
}


// (opcional) DELETE /cursos/:cursoId/videoaulas/:id
export async function deleteVideoAula(cursoId: string, id: string) {
  await api.delete(`/cursos/${cursoId}/videoaulas/${id}`);
}
