import { api } from '../lib/api';

export type Matricula = {
  id: string;
  alunoId: string;
  cursoId: string;
  turmaId?: string | null;
  status: 'ATIVA'|'TRANCADA'|'CANCELADA'|'CONCLUIDA';
  dataInicio?: string | null;
  dataFim?: string | null;
  curso?: { id: string; nome: string; modality: 'ONLINE'|'PRESENCIAL' } | null;
};

export async function listMatriculasAtivasDoAluno(alunoId: string) {
  const { data } = await api.get<{ data: Matricula[]; total: number; page: number; perPage: number }>(
    '/matriculas',
    { params: { alunoId, status: 'ATIVA', page: 1, perPage: 50 } }
  );
  return data.data;
}
