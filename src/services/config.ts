/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../lib/api';

export type SistemaConfig = {
  id: string;
  diasAtrasoBloqueio: number;
  updatedAt: string;
};

export async function getSistemaConfig() {
  const { data } = await api.get<SistemaConfig>('/admin/config/financeiro');
  return data;
}

export async function updateSistemaConfig(diasAtrasoBloqueio: number) {
  const { data } = await api.patch<SistemaConfig>('/admin/config/financeiro', {
    diasAtrasoBloqueio,
  });
  return data;
}
