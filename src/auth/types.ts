export type Role = 'ALUNO' | 'ADMIN' | 'MASTER';

export type FinanceLock = {
  active: boolean;
  limite: number;
  maiorAtraso: number;
} | null;

export type Profile = {
  id: string;
  role: Role;
  nome: string | null;
  email: string | null;
  alunoId: string | null;
  financeLock?: FinanceLock;
};
