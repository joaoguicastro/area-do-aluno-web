/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';

export type VideoAula = {
  id: string;
  cursoId: string;
  moduloId?: string | null;
  titulo: string;
  descricao?: string | null;
  urlVideo: string;
  ordem?: number | null;
  duracaoMin?: number | null;
  createdAt: string;
};

export type CreateVideoAulaPayload = {
  titulo: string;
  urlVideo: string;
  descricao?: string;
  ordem?: number;
  duracaoMin?: number;
  moduloId?: string | null; // opcional
};

// helper: extrai lista tolerando vários formatos
function toArray<T = any>(raw: any): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  if (Array.isArray(raw?.data)) return raw.data as T[];
  if (Array.isArray(raw?.items)) return raw.items as T[];
  if (Array.isArray(raw?.rows)) return raw.rows as T[];
  return [];
}

// GET /cursos/:cursoId/videoaulas
export async function listVideoAulas(cursoId: string): Promise<VideoAula[]> {
  const { data } = await api.get(`/cursos/${cursoId}/videoaulas`);
  return toArray<VideoAula>(data);
}

// POST /cursos/:cursoId/videoaulas
export async function addVideoAula(cursoId: string, payload: CreateVideoAulaPayload) {
  const body: any = {
    titulo: (payload.titulo ?? '').trim(),
    urlVideo: payload.urlVideo,
  };
  if (payload.descricao) body.descricao = payload.descricao.trim();

  const nOrd = Number(payload.ordem);
  if (Number.isFinite(nOrd) && nOrd > 0) body.ordem = Math.trunc(nOrd);

  const nDur = Number(payload.duracaoMin);
  if (Number.isFinite(nDur) && nDur > 0) body.duracaoMin = Math.trunc(nDur);

  if (payload.moduloId) body.moduloId = payload.moduloId; // envia apenas se escolhido

  const { data } = await api.post(`/cursos/${cursoId}/videoaulas`, body, {
    headers: { 'Content-Type': 'application/json' },
  });
  return (data?.videoaula ?? data?.data ?? data) as VideoAula;
}

// DELETE /cursos/:cursoId/videoaulas/:id
export async function deleteVideoAula(cursoId: string, id: string) {
  await api.delete(`/cursos/${cursoId}/videoaulas/${id}`);
}
