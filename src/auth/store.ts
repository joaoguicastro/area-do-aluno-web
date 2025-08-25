import { create } from 'zustand';
import type { Profile, Role } from './types';

type AuthState = {
  token: string | null;
  profile: Profile | null;
  setToken: (t: string) => void;
  setProfile: (p: Profile | null) => void;
  setManualRole: (r: Role) => void;
  clear: () => void;
};

export const useAuth = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  profile: null,
  setToken: (t) => { localStorage.setItem('token', t); set({ token: t }); },
  setProfile: (p) => set({ profile: p }),
  setManualRole: (r) => {
    const p = get().profile ?? { id: '', role: r, nome: null, alunoId: null, email: null };
    set({ profile: { ...p, role: r } });
  },
  clear: () => { localStorage.removeItem('token'); set({ token: null, profile: null }); },
}));
