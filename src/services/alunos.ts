/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';
import type { ListResponse } from './cursos';

// src/services/alunos.ts
export type Aluno = {
  id: string;
  nome: string;
  cpfAluno: string;
  matricula: string;
  cidade: string;
  email?: string | null;
  telefone?: string | null;
} & Partial<{
  dataNascimentoAluno: string | null;
  nomeResponsavel: string;
  cpfResponsavel: string;
  dataNascimentoResponsavel: string | null;
  rua: string;
  numero: string;
  bairro: string;
  fotoUrl: string | null;
}>;


export type CreateAlunoPayload = {
  nome: string;
  cpfAluno: string;               
  dataNascimentoAluno: string;      
  nomeResponsavel: string;
  cpfResponsavel: string;         
  dataNascimentoResponsavel: string;
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
  const { page = 1, perPage = 10, ...rest } = params;
  const { data } = await api.get<ListResponse<Aluno>>('/alunos', {
    params: { page, perPage, ...rest },
  });
  return data;
}

export async function createAluno(payload: CreateAlunoPayload) {
  const { data } = await api.post<{ aluno: Aluno }>('/alunos', payload);
  return data.aluno;
}

export type UpdateAlunoPayload = Partial<Omit<CreateAlunoPayload, 'senha' | 'prefixoMatricula'>>;
export async function updateAluno(id: string, payload: UpdateAlunoPayload) {
  const { data } = await api.patch<{ aluno: Aluno }>(`/alunos/${id}`, payload);
  return data.aluno;
}

export async function deleteAluno(id: string) {
  await api.delete(`/alunos/${id}`);
}

export async function getAlunoById(id: string) {
  const { data } = await api.get<{ aluno: Aluno } | Aluno>(`/alunos/${id}`);
  return (data as any).aluno ?? (data as any);
}
