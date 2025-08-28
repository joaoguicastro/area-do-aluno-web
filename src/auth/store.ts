import { create } from 'zustand';
import type { Profile, Role } from './types';

type AuthState = {
  token: string | null;
  role: Role | null;
  profile: Profile | null;

  setToken: (t: string) => void;
  setProfile: (p: Profile | null) => void;
  setManualRole: (r: Role) => void;
  setAuth: (args: { token?: string | null; profile?: Profile | null; role?: Role | null }) => void;
  clear: () => void;
};

export const useAuth = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  role: null,
  profile: null,

  setToken: (t) => {
    localStorage.setItem('token', t);
    set({ token: t });
  },

  setProfile: (p) => {
    set({ profile: p, role: p?.role ?? null });
  },

  setManualRole: (r) => {
    const prev = get().profile;
    const base: Profile =
      prev ?? { id: '', role: r, nome: null, alunoId: null, email: null };
    set({ profile: { ...base, role: r }, role: r });
  },

  setAuth: ({ token, profile, role }) => {
    if (token !== undefined) {
      if (token) localStorage.setItem('token', token);
      else localStorage.removeItem('token');
    }
    set((state) => ({
      token: token ?? state.token,
      profile: profile ?? state.profile,
      role: (role ?? profile?.role ?? state.role) ?? null,
    }));
  },

  clear: () => {
    localStorage.removeItem('token');
    set({ token: null, profile: null, role: null });
  },
}));
