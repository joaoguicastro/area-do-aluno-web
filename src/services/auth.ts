/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';
import type { Profile, Role } from '../auth/types';

function parseJwt<T = any>(token: string): T | null {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}

function normalizeRole(r: any): Role {
  switch (String(r ?? '').toLowerCase()) {
    case 'aluno': return 'ALUNO';
    case 'master': return 'MASTER';
    case 'admin':
    default: return 'ADMIN';
  }
}

/** Busca o perfil a partir do token. Não chama mais nenhum “gate”. */
export async function fetchProfile(token: string): Promise<Profile | null> {
  const payload = parseJwt<any>(token);
  if (!payload) return null;

  const role = normalizeRole(payload.role ?? payload.claims?.role ?? 'admin');

  if (role === 'ALUNO') {
    try {
      const { data } = await api.get<{ aluno: { id: string; nome: string; email?: string | null; matricula?: string } }>('/aluno/me');
      return {
        id: data.aluno.id,
        role: 'ALUNO',
        nome: data.aluno.nome ?? null,
        email: data.aluno.email ?? null,
        alunoId: data.aluno.id,
      };
    } catch {
      const id = payload.sub ?? payload.userId ?? '';
      return { id, role: 'ALUNO', alunoId: id, nome: payload.nome ?? null, email: payload.email ?? null };
    }
  }

  return {
    id: payload.sub ?? payload.userId ?? '',
    role,
    nome: payload.nome ?? null,
    email: payload.email ?? null,
    alunoId: null,
  };
}
