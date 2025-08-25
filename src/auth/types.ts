export type Role = 'MASTER' | 'ADMIN' | 'FUNCIONARIO' | 'ALUNO';

export type Profile = {
  id: string;
  role: Role;
  nome?: string | null;
  alunoId?: string | null;
  email?: string | null;
};
