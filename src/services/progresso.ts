import { api } from '../lib/api';

export type CursoProgresso = {
  lastVideoAulaId: string | null;
  doneIds: string[];
  positions: Record<string, number>;
  total: number;
  feitos: number;
  updatedAt: string | null;
};

// GET progresso do curso do aluno logado
export async function getCursoProgresso(cursoId: string): Promise<CursoProgresso> {
  const { data } = await api.get(`/me/cursos/${cursoId}/progresso`);
  // tolera { progress: {...} } ou o próprio objeto
  return data?.progress ?? data;
}

// PATCH progresso de uma videoaula
export async function patchProgresso(
  cursoId: string,
  body: { videoAulaId: string; positionSec?: number; completed?: boolean }
) {
  const { data } = await api.patch(`/me/cursos/${cursoId}/progresso`, body);
  return data?.progresso ?? data;
}
