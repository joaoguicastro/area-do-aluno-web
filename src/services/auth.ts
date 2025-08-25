/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';
import type { Profile, Role } from '../auth/types';

function parseJwt<T = any>(token: string): T | null {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch { return null; }
}

export async function fetchProfile(token: string): Promise<Profile | null> {
  try {
    const { data } = await api.get<{ user?: any; profile?: any; role?: Role; alunoId?: string }>('/auth/me');
    const p = data.profile ?? data.user ?? data;
    const role: Role = (data.role ?? p?.role ?? 'ADMIN') as Role;
    return {
      id: p?.id ?? p?.userId ?? '',
      role,
      nome: p?.nome ?? p?.name ?? null,
      email: p?.email ?? null,
      alunoId: p?.alunoId ?? data.alunoId ?? null,
    };
  } catch {
    const payload = parseJwt<any>(token);
    if (!payload) return null;
    const role = (payload.role ?? payload.claims?.role ?? 'ADMIN') as Role;
    const alunoId = payload.alunoId ?? payload.claims?.alunoId ?? null;
    const id = payload.sub ?? payload.userId ?? '';
    return { id, role, alunoId, nome: payload.nome ?? null, email: payload.email ?? null };
  }
}
