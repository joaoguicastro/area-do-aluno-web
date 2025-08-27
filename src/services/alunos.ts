/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';
import type { ListResponse } from './cursos';

export type Aluno = {
  id: string;
  nome: string;
  cpfAluno: string;              // armazenado sem máscara (11 dígitos)
  matricula: string;
  email?: string | null;
  telefone?: string | null;
  cidade: string;
  createdAt: string;
};

export type CreateAlunoPayload = {
  nome: string;
  cpfAluno: string;                  // enviar só dígitos
  dataNascimentoAluno: string;       // 'YYYY-MM-DD'
  nomeResponsavel: string;
  cpfResponsavel: string;            // só dígitos
  dataNascimentoResponsavel: string; // 'YYYY-MM-DD'
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  telefone?: string | null;
  email?: string | null;
  fotoUrl?: string | null;

  // novos (do seu back): senha e prefixo da matrícula
  senha: string;
  prefixoMatricula?: string; // ex.: 'INF'
};

export async function listAlunos(params: { q?: string; page?: number; perPage?: number } = {}) {
  const { data } = await api.get<ListResponse<Aluno>>('/alunos', { params });
  return data;
}

export async function createAluno(payload: CreateAlunoPayload) {
  const { data } = await api.post<{ aluno: Aluno }>('/alunos', payload);
  return data.aluno;
}

export async function updateAluno(
  id: string,
  payload: Partial<Omit<CreateAlunoPayload, 'senha' | 'prefixoMatricula'>>
) {
  const { data } = await api.patch<{ aluno: Aluno }>(`/alunos/${id}`, payload);
  return data.aluno;
}

export async function deleteAluno(id: string) {
  await api.delete(`/alunos/${id}`);
}
