/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFinanceGate, listMinhasParcelas } from '../../../services/financeiro';
import { Card } from '../../../ui/Card';

function formatBRL(n?: number | null) {
  const v = typeof n === 'number' ? n : 0;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDateBR(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
}

type Filtro = 'todas' | 'abertas' | 'vencidas' | 'pagas';

export default function FinanceiroLock() {
  const [filtro, setFiltro] = useState<Filtro>('todas');

  // Mantém o gate (pode trazer regras/mensagens futuramente)
  const gateQ = useQuery({
    queryKey: ['financeiro-gate'],
    queryFn: getFinanceGate,
    staleTime: 10_000,
  });

  const parcelasQ = useQuery({
    queryKey: ['financeiro-parcelas'],
    queryFn: listMinhasParcelas,
    staleTime: 10_000,
    select(data: any) {
      const rows: any[] = (data?.data ?? []).map((p: any) => {
        const pago = !!(p.pago ?? p.status === 'PAGO');
        const diasAtraso = Number(p.diasAtraso ?? 0);
        return {
          id: p.id,
          cursoNome: p.cursoNome ?? p.curso?.nome ?? '—',
          numero: p.numero ?? p.parcela ?? '—',
          vencimento: p.vencimento ?? p.dataVencimento ?? null,
          diasAtraso,
          valor: Number(p.valor ?? p.valorParcela ?? 0),
          pago,
          status: p.status ?? (pago ? 'PAGO' : diasAtraso > 0 ? 'VENCIDA' : 'ABERTA'),
          dataPagamento: p.dataPagamento ?? null,
        };
      });

      // Ordenação:
      // 1) vencidas e em aberto primeiro, depois pagas
      // 2) por data de vencimento
      rows.sort((a, b) => {
        const aScore = a.pago ? 1 : 0;
        const bScore = b.pago ? 1 : 0;
        if (aScore !== bScore) return aScore - bScore;
        const ta = a.vencimento ? new Date(a.vencimento).getTime() : 0;
        const tb = b.vencimento ? new Date(b.vencimento).getTime() : 0;
        return ta - tb;
      });

      return {
        resumo: data?.resumo ?? null,
        rows,
      };
    },
  });

  const resumo = parcelasQ.data?.resumo ?? null;
  const rows = useMemo(() => parcelasQ.data?.rows ?? [], [parcelasQ.data?.rows]);

  const totais = useMemo(() => {
    let totalVencido = 0;
    let totalAberto = 0;
    let totalPago = 0;
    let qtdPagas = 0;
    let qtdVencidas = 0;
    let qtdAbertas = 0;

    for (const r of rows) {
      if (r.pago) {
        totalPago += r.valor;
        qtdPagas += 1;
      } else if (r.diasAtraso > 0) {
        totalVencido += r.valor;
        qtdVencidas += 1;
      } else {
        totalAberto += r.valor;
        qtdAbertas += 1;
      }
    }
    return { totalVencido, totalAberto, totalPago, qtdPagas, qtdVencidas, qtdAbertas, totalGeral: totalVencido + totalAberto + totalPago };
  }, [rows]);

  // aplica filtro escolhido — agora pagas também aparecem quando filtro = 'todas' ou 'pagas'
  const rowsFiltradas = useMemo(() => {
    switch (filtro) {
      case 'abertas':
        return rows.filter((r) => !r.pago && r.diasAtraso <= 0);
      case 'vencidas':
        return rows.filter((r) => !r.pago && r.diasAtraso > 0);
      case 'pagas':
        return rows.filter((r) => r.pago);
      case 'todas':
      default:
        return rows;
    }
  }, [rows, filtro]);

  const loading = parcelasQ.isLoading;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Card className="p-6">
        <div className="text-lg font-semibold">Financeiro</div>
        <p className="text-sm text-[color:var(--text-muted)] mt-1">
          Aqui você acompanha suas parcelas.
        </p>
        {/* Mensagem opcional vinda do back no futuro: {(gateQ.data as any)?.message} */}
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between gap-3 flex-wrap">
          <div className="font-semibold">Minhas parcelas</div>
          <div className="text-sm text-[color:var(--text-muted)]">
            {resumo ? (
              <>
                Vencidas: <b>{resumo.vencidas ?? totais.qtdVencidas}</b>
                {' · '}Maior atraso: <b>{resumo.maiorAtrasoDias ?? 0}</b> dias
                {' · '}Total vencido: <b>{formatBRL(resumo.totalVencido ?? totais.totalVencido)}</b>
                {' · '}Pagas: <b>{totais.qtdPagas}</b> (<b>{formatBRL(totais.totalPago)}</b>)
              </>
            ) : (
              <>
                Vencidas: <b>{totais.qtdVencidas}</b> (<b>{formatBRL(totais.totalVencido)}</b>)
                {' · '}Em aberto: <b>{totais.qtdAbertas}</b> (<b>{formatBRL(totais.totalAberto)}</b>)
                {' · '}Pagas: <b>{totais.qtdPagas}</b> (<b>{formatBRL(totais.totalPago)}</b>)
              </>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-2">
          {([
            { key: 'todas', label: 'Todas' },
            { key: 'abertas', label: 'Em aberto' },
            { key: 'vencidas', label: 'Vencidas' },
            { key: 'pagas', label: 'Pagas' },
          ] as { key: Filtro; label: string }[]).map((f) => {
            const active = filtro === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                className={[
                  'px-3 py-1.5 rounded-full text-sm border transition',
                  active
                    ? 'bg-[var(--brand-primary)] text-white border-transparent'
                    : 'border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5',
                ].join(' ')}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="p-4 text-sm text-[color:var(--text-muted)]">Carregando parcelas…</div>
        )}

        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[color:var(--text-muted)]">
                  <th className="py-2 px-3">Curso</th>
                  <th className="py-2 px-3">Parcela</th>
                  <th className="py-2 px-3">Vencimento</th>
                  <th className="py-2 px-3">Situação</th>
                  <th className="py-2 px-3">Valor</th>
                </tr>
              </thead>
              <tbody>
                {rowsFiltradas.map((p: any) => {
                  const status =
                    p.pago ? 'Paga' : p.diasAtraso > 0 ? `Vencida (${p.diasAtraso}d)` : 'Em aberto';
                  const statusClass =
                    p.pago
                      ? 'text-green-700 bg-green-100'
                      : p.diasAtraso > 0
                        ? 'text-red-700 bg-red-100'
                        : 'text-amber-800 bg-amber-100';

                  return (
                    <tr key={p.id} className="border-t border-black/5">
                      <td className="py-2 px-3">{p.cursoNome}</td>
                      <td className="py-2 px-3">#{p.numero}</td>
                      <td className="py-2 px-3">{formatDateBR(p.vencimento)}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${statusClass}`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-2 px-3">{formatBRL(p.valor)}</td>
                      <td className="py-2 px-3">
                      </td>
                    </tr>
                  );
                })}
                {rowsFiltradas.length === 0 && (
                  <tr>
                    <td className="py-6 text-center text-[color:var(--text-muted)]" colSpan={6}>
                      Nenhuma parcela encontrada.
                    </td>
                  </tr>
                )}
              </tbody>

              {rowsFiltradas.length > 0 && (
                <tfoot>
                  <tr className="border-t border-black/5">
                    <td className="py-3 px-3 text-right text-[color:var(--text-muted)]" colSpan={4}>
                      Totais (todas as parcelas)
                    </td>
                    <td className="py-3 px-3 font-medium">{formatBRL(totais.totalGeral)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </Card>

      {(gateQ.error || parcelasQ.error) && (
        <div className="text-red-600 text-sm">
          {String(gateQ.error || parcelasQ.error)}
        </div>
      )}
    </div>
  );
}
