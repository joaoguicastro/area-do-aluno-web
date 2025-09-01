/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';
import type { ListResponse } from './cursos';

export type InformativoPublico = 'ALL' | 'CURSO' | 'TURMA' | 'ALUNO';

export type Informativo = {
  id: string;
  titulo: string;
  conteudo: string;
  publico: InformativoPublico;
  cursoId?: string | null;
  turmaId?: string | null;
  alunoId?: string | null;
  createdAt: string;
};

export type CreateInformativoPayload = {
  titulo: string;
  conteudo: string;
  publico: InformativoPublico;
  cursoId?: string | null;
  turmaId?: string | null;
  alunoId?: string | null;
};

export async function listInformativosAdmin(params: { q?: string; page?: number; perPage?: number } = {}) {
  const { data } = await api.get<ListResponse<Informativo>>('/informativos', { params });
  return data;
}

export async function createInformativo(payload: CreateInformativoPayload) {
  const body: any = {
    titulo: payload.titulo,
    conteudo: payload.conteudo,
    publico: payload.publico,
  };
  if (payload.cursoId) body.cursoId = payload.cursoId;
  if (payload.turmaId) body.turmaId = payload.turmaId;
  if (payload.alunoId) body.alunoId = payload.alunoId;

  const { data } = await api.post<{ informativo: Informativo }>('/informativos', body);
  return data.informativo;
}

export async function deleteInformativo(id: string) {
  await api.delete(`/informativos/${id}`);
}

export async function listInformativosAluno(params: { page?: number; perPage?: number } = {}) {
  const { data } = await api.get('/me/informativos', {
    params: { page: params.page ?? 1, perPage: params.perPage ?? 20 },
  });
  return (Array.isArray(data) ? { data } : data) as { data: Informativo[]; total?: number };
}
