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
  createdAt: string;           // ISO
  liberarEm?: string | null;   // ISO ou null
};

export type CreateVideoAulaPayload = {
  titulo: string;
  urlVideo: string;
  descricao?: string | null;
  ordem?: number | null;
  duracaoMin?: number | null;
  moduloId?: string | null;
  liberarEm?: string | null | Date; // aceita 'YYYY-MM-DD', ISO ou Date
};

// ----- helpers -----
function normalizeVideoAula(raw: any): VideoAula {
  return {
    id: raw.id,
    cursoId: raw.cursoId,
    moduloId: raw.moduloId ?? null,
    titulo: raw.titulo,
    descricao: raw.descricao ?? null,
    urlVideo: raw.urlVideo,
    ordem: raw.ordem ?? null,
    duracaoMin: raw.duracaoMin ?? null,
    createdAt: String(raw.createdAt ?? ''),
    liberarEm: raw.liberarEm ? String(raw.liberarEm) : null,
  };
}

function normalizeLiberarEm(v: string | null | Date | undefined) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  // se vier 'YYYY-MM-DD', fixa 00:00:00 local
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T00:00:00`;
  return v; // já é ISO
}

// ----- API -----
export async function listVideoAulas(cursoId: string): Promise<VideoAula[]> {
  const { data } = await api.get(`/cursos/${cursoId}/videoaulas`);
  const arr = Array.isArray(data) ? data : (data?.data ?? data?.videos ?? []);
  return (arr as any[]).map(normalizeVideoAula);
}

export async function addVideoAula(cursoId: string, payload: CreateVideoAulaPayload) {
  const body: any = {
    titulo: payload.titulo.trim(),
    urlVideo: payload.urlVideo,
  };
  if (payload.descricao != null && payload.descricao !== '') body.descricao = payload.descricao;
  if (payload.ordem != null) body.ordem = Number(payload.ordem);
  if (payload.duracaoMin != null) body.duracaoMin = Number(payload.duracaoMin);
  if (payload.moduloId != null && payload.moduloId !== '') body.moduloId = payload.moduloId;
  if (payload.liberarEm !== undefined) body.liberarEm = normalizeLiberarEm(payload.liberarEm);

  const { data } = await api.post(`/cursos/${cursoId}/videoaulas`, body);
  // back pode devolver { video: {...} } ou o objeto direto
  const raw = (data?.video ?? data) as any;
  return normalizeVideoAula(raw);
}

export async function deleteVideoAula(cursoId: string, id: string) {
  await api.delete(`/cursos/${cursoId}/videoaulas/${id}`);
}
