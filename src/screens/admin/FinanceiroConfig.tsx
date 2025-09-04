/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSistemaConfig, updateSistemaConfig } from '../../services/config';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';

export default function FinanceiroConfig() {
  const qc = useQueryClient();

  const cfgQ = useQuery({
    queryKey: ['sistema-config'],
    queryFn: getSistemaConfig,
    staleTime: 60_000,
  });

  const [dias, setDias] = useState<string>('');

  // Preenche o campo quando a config chega
  const cfg = cfgQ.data;
  const initialDias = cfg?.diasAtrasoBloqueio ?? 0;

  const mut = useMutation({
    mutationFn: (value: number) => updateSistemaConfig(value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sistema-config'] });
    },
  });

  const loading = cfgQ.isLoading || cfgQ.isFetching;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = dias === '' ? initialDias : parseInt(dias, 10);
    if (!Number.isFinite(v) || v < 0) {
      alert('Informe um número inteiro maior ou igual a zero.');
      return;
    }
    mut.mutate(v);
  }

  function handleReset() {
    setDias(String(initialDias));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Configurações Financeiras</h1>
        {cfg && (
          <span className="text-xs text-[color:var(--text-muted)]">
            Última atualização: {new Date(cfg.updatedAt).toLocaleString('pt-BR')}
          </span>
        )}
      </div>

      <Card className="p-4">
        {loading && <p>Carregando…</p>}

        {cfgQ.error && (
          <p className="text-red-600">
            {(cfgQ as any).error?.response?.data?.message ?? 'Erro ao carregar configurações.'}
          </p>
        )}

        {cfg && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="label">Dias de atraso para bloquear acesso</div>
              <div className="grid grid-cols-[160px_1fr] gap-3 max-w-md items-center">
                <Input
                  type="number"
                  min={0}
                  value={dias === '' ? String(initialDias) : dias}
                  onChange={(e) => setDias(e.target.value)}
                />
                <div className="text-sm text-[color:var(--text-muted)]">
                  <b>0</b> desativa o bloqueio por inadimplência.  
                  Acima de <b>X</b> dias em atraso → aluno fica bloqueado.
                </div>
              </div>
            </div>

            {mut.error && (
              <p className="text-red-600 text-sm">
                {(mut as any).error?.response?.data?.message ?? 'Erro ao salvar.'}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={mut.isPending}>
                {mut.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
              <button type="button" className="btn btn-ghost" onClick={handleReset}>
                Restaurar valor atual
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
