/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';

export type Modulo = {
  id: string;
  cursoId: string;
  nome: string;
  ordem: number | null;
  createdAt: string;
  updatedAt: string;
};

export async function listModulos(cursoId: string): Promise<Modulo[]> {
  if (!cursoId) return [];
  const { data } = await api.get(`/cursos/${cursoId}/modulos`);
  return (data?.data ?? data) as Modulo[];
}

export async function createModulo(
  cursoId: string,
  payload: { nome: string; ordem?: number | null }
) {
  const body: any = {
    cursoId,                              // <- necessário para o Zod do back
    nome: (payload.nome ?? '').trim(),
  };

  const n = Number(payload.ordem);
  if (Number.isFinite(n) && n > 0) body.ordem = Math.trunc(n); // envia ordem só se int > 0

  const { data } = await api.post(`/cursos/${cursoId}/modulos`, body, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data?.modulo ?? data?.data ?? data;
}

export async function updateModulo(
  id: string,
  payload: { nome?: string; ordem?: number | null }
) {
  const body: any = {};
  if (typeof payload.nome !== 'undefined') body.nome = (payload.nome ?? '').trim();

  if (typeof payload.ordem !== 'undefined') {
    const n = Number(payload.ordem);
    body.ordem = Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
  }

  const { data } = await api.patch(`/modulos/${id}`, body, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data?.modulo ?? data?.data ?? data;
}

export async function deleteModulo(id: string) {
  await api.delete(`/modulos/${id}`);
}
