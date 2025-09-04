// src/services/videoaulas.ts
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
  createdAt?: string;          // deixa opcional pra ser resiliente
  liberarEm?: string | null;
};

export type CreateVideoAulaPayload = {
  titulo: string;
  urlVideo: string;
  descricao?: string | null;
  ordem?: number | null;
  duracaoMin?: number | null;
  moduloId?: string | null;
  liberarEm?: string | null | Date;
};

// --- helpers ---
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
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    liberarEm: raw.liberarEm != null ? String(raw.liberarEm) : null,
  };
}

function extractArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    if (Array.isArray((data as any).data)) return (data as any).data;
    if (Array.isArray((data as any).videos)) return (data as any).videos;        // <= seu caso
    if (Array.isArray((data as any).videoAulas)) return (data as any).videoAulas;
  }
  return [];
}

function normalizeLiberarEm(v: string | null | Date | undefined) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T00:00:00`;
  return v;
}

// --- API ---
export async function listVideoAulas(cursoId: string) {
  try {
    const { data } = await api.get(`/cursos/${cursoId}/videoaulas`);
    const list = extractArray(data).map(normalizeVideoAula);
    return list as VideoAula[];
  } catch (e: any) {
    const code = e?.response?.data?.code;
    if (e?.response?.status === 403 && code === 'BLOQUEIO_INADIMPLENCIA') {
      const err = new Error(e.response.data.message);
      (err as any).code = code;
      (err as any).info = e.response.data;
      throw err;
    }
    throw e;
  }
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
  const raw = (data?.video ?? data?.videoAula ?? data?.data ?? data) as any;
  return normalizeVideoAula(raw);
}

export async function deleteVideoAula(cursoId: string, id: string) {
  await api.delete(`/cursos/${cursoId}/videoaulas/${id}`);
}
