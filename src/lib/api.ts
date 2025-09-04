import axios from 'axios';
// evite import direto do useAuth se der ciclo; se já usa, mantenha.
import { useAuth } from '../auth/store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

// anexa token
api.interceptors.request.use((config) => {
  const token = useAuth.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url || '');

    const safePrefixes = [
      '/me/financeiro',   
      '/financeiro',      // caso use outra convenção
      '/cursos/',         
    ];

    const isSafe = safePrefixes.some((p) => url.includes(p));

    // só considere "crítico" quando falha o profile/refresh/autenticação
    const isCriticalAuth = (
      url.includes('/aluno/me') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/me')
    );

    if (status === 401 && isCriticalAuth && !isSafe) {
      // logout somente nos casos críticos
      useAuth.getState().clear();
      // redirecione só aqui:
      window.location.href = '/login';
    }

    // em todos os outros casos, apenas propaga o erro
    return Promise.reject(error);
  }
);
