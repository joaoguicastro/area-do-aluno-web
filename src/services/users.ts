/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';

export type UserRole = 'MASTER' | 'ADMIN' | 'OPERADOR' | 'PROFESSOR';

export type CreateUserPayload = {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
};

export type Funcionario = {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type ListResponse<T> = {
  data: T[];
  total: number;
  page: number;
  perPage: number;
};

export type UpdateFuncionarioPayload = Partial<{
  nome: string;
  email: string;
  role: UserRole;
  senha: string; 
}>;

export async function registerUser(payload: CreateUserPayload) {
  const { data } = await api.post('/auth/register', payload);
  return data;
}

export async function listFuncionarios(params: { q?: string; page?: number; perPage?: number } = {}) {
  const { data } = await api.get<ListResponse<Funcionario>>('/auth/funcionarios', { params });
  return data;
}

export async function updateFuncionario(id: string, payload: UpdateFuncionarioPayload) {
  const body: Record<string, any> = {};
  if (payload.nome !== undefined) body.nome = payload.nome;
  if (payload.email !== undefined) body.email = payload.email;
  if (payload.role !== undefined) body.role = payload.role;
  if (payload.senha !== undefined && payload.senha !== '') body.senha = payload.senha;

  const { data } = await api.put<{ user: Funcionario }>(`/auth/funcionarios/${id}`, body);
  return data.user;
}

export async function deleteFuncionario(id: string) {
  await api.delete(`/auth/funcionarios/${id}`);
}

export async function fetchUsers() {
  const res = await listFuncionarios({ page: 1, perPage: 50 });
  return res.data;
}
