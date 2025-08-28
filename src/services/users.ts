/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';

export type UserRole = 'MASTER' | 'ADMIN' | 'OPERADOR' | 'PROFESSOR';

export type CreateUserPayload = {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
};

export async function registerUser(payload: CreateUserPayload) {
  const { data } = await api.post('/auth/register', payload);
  return data;
}
