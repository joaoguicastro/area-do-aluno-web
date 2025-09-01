/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';

export type MeAluno = {
  id: string;
  nome?: string | null;
  email?: string | null;
  // campos “novos” que o back envia:
  cpfAluno?: string | null;
  matricula?: string | null;
  // compat: ainda aceitamos o legado combinado
  cpfOrMatricula?: string | null;
  // ISO (YYYY-MM-DD ou ISO completo)
  dataNascimento?: string | null;
};

export type MeResponse = {
  id: string;
  nome: string;
  email?: string | null;
  role: 'MASTER' | 'ADMIN' | 'OPERADOR' | 'PROFESSOR' | 'aluno';
  alunoId?: string | null;
  aluno?: MeAluno | null;
};

export async function getMe(): Promise<MeResponse> {
  const { data } = await api.get('/me');
  return (data?.data ?? data) as MeResponse;
}
