/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';
import type { ListResponse } from './cursos';

export type Prova = {
  id: string;
  cursoId: string;
  titulo: string;
  descricao?: string | null;
  inicioEm?: string | null; // ISO
  fimEm?: string | null;    // ISO
  duracaoMin?: number | null;
  publicado: boolean;
  createdAt: string;

  // opcionais se o back enviar
  cursoNome?: string | null;
};

export type CreateProvaPayload = {
  cursoId: string;
  titulo: string;
  descricao?: string | null;
  inicioEm?: string | null;  // 'YYYY-MM-DD' (ou ISO completo, conforme seu back)
  fimEm?: string | null;     // idem
  duracaoMin?: number | null;
  publicado?: boolean;       // default false
};

export type Questao = {
  id: string;
  provaId: string;
  enunciado: string;
  ordem?: number | null;
  tipo: 'MULTIPLA_ESCOLHA' | 'DISSERTATIVA'; // ajuste se for outro enum
  createdAt: string;
  opcoes?: Opcao[];
};

export type Opcao = {
  id: string;
  questaoId: string;
  texto: string;
  correta?: boolean; // se existir no back
};

export type Submissao = {
  id: string;
  provaId: string;
  alunoId: string;
  status: 'EM_ANDAMENTO' | 'FINALIZADA'; // ajuste ao seu back
  nota?: number | null;
  createdAt: string;
};

// ===== Provas =====
export async function listProvas(params: { q?: string; page?: number; perPage?: number; cursoId?: string } = {}) {
  const { data } = await api.get<ListResponse<Prova>>('/provas', { params });
  return data;
}

export async function createProva(payload: CreateProvaPayload) {
  const { data } = await api.post<{ prova: Prova }>('/provas', payload);
  return data.prova;
}

export async function publishProva(id: string) {
  const { data } = await api.patch<{ prova: Prova }>(`/provas/${id}/publicar`, {});
  return data.prova;
}

// ===== Questões =====
export async function addQuestao(provaId: string, payload: { enunciado: string; tipo: Questao['tipo']; ordem?: number | null }) {
  const { data } = await api.post<{ questao: Questao }>(`/provas/${provaId}/questoes`, payload);
  return data.questao;
}

export async function listQuestoes(provaId: string) {
  const { data } = await api.get<{ data: Questao[] }>(`/provas/${provaId}/questoes`);
  return data.data;
}

export async function addOpcao(questaoId: string, payload: { texto: string; correta?: boolean }) {
  const { data } = await api.post<{ opcao: Opcao }>(`/provas/questoes/${questaoId}/opcoes`, payload);
  return data.opcao;
}

// ===== Submissões (área do aluno) =====
export async function startSubmissao(provaId: string) {
  const { data } = await api.post<{ submissao: Submissao }>(`/provas/${provaId}/submissoes/start`, {});
  return data.submissao;
}

export async function responderQuestao(submissaoId: string, payload: { questaoId: string; respostaTexto?: string | null; opcaoId?: string | null }) {
  const { data } = await api.post<{ ok: true }>(`/provas/submissoes/${submissaoId}/responder`, payload);
  return data;
}

export async function finalizarSubmissao(submissaoId: string) {
  const { data } = await api.post<{ submissao: Submissao }>(`/provas/submissoes/${submissaoId}/finalizar`, {});
  return data.submissao;
}
