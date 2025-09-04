/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listCursos, createCurso, deleteCurso } from '../../../services/cursos';
import type { Curso } from '../../../services/cursos'; // <- type-only import ✅
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { useDebounce } from '../../../utils/useDebounce';
import { Plus, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../../../ui/Delete';

export default function CursosList() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q);

  const { data, isFetching, error } = useQuery({
    queryKey: ['cursos', { q: debounced, page }],
    queryFn: () => listCursos({ q: debounced || undefined, page, perPage: 10 }),
    staleTime: 1000 * 10,
  });

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-600">Erro ao carregar cursos.</p>
      </div>
    );
  }

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ nome: string; modality: 'ONLINE'|'PRESENCIAL'; duracaoHoras?: number | '' }>({
    nome: '',
    modality: 'ONLINE',
    duracaoHoras: '',
  });

  // ---- Financeiro (novo) ----
  const [withFin, setWithFin] = useState(true); // criar com financeiro por padrão
  const [fin, setFin] = useState<{
    nome: string;
    valorTotal: string;        // string para permitir vírgula; normalizamos no submit
    numeroParcelas: number | '';
    diaVencimento: number | '';
    jurosAoMes: string;        // string para permitir vírgula
    multaPercent: string;      // string para permitir vírgula
  }>({
    nome: 'Plano Padrão',
    valorTotal: '',
    numeroParcelas: '',
    diaVencimento: '',
    jurosAoMes: '0',
    multaPercent: '0',
  });

  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  function toNumberOrNull(v: string | number | ''): number | null {
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v === 'number') return v;
    // troca vírgula por ponto para aceitar "1,99"
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true); setErr(null);
    try {
      const payload: any = {
        nome: form.nome.trim(),
        modality: form.modality,
        duracaoHoras: form.duracaoHoras === '' ? null : Number(form.duracaoHoras),
      };

      if (withFin) {
        const valorTotal = toNumberOrNull(fin.valorTotal);
        const numeroParcelas = fin.numeroParcelas === '' ? null : Number(fin.numeroParcelas);
        const diaVencimento = fin.diaVencimento === '' ? null : Number(fin.diaVencimento);
        const jurosAoMes = toNumberOrNull(fin.jurosAoMes);
        const multaPercent = toNumberOrNull(fin.multaPercent);

        if (valorTotal == null || !numeroParcelas) {
          throw new Error('Informe valor total e número de parcelas.');
        }
        if (diaVencimento != null && (diaVencimento < 1 || diaVencimento > 28)) {
          throw new Error('Dia de vencimento deve ser entre 1 e 28.');
        }

        payload.financeiro = {
          nome: fin.nome.trim() || 'Plano',
          valorTotal,
          numeroParcelas,
          diaVencimento,
          jurosAoMes: jurosAoMes ?? 0,
          multaPercent: multaPercent ?? 0,
        };
      }

      await createCurso(payload);
      setOpen(false);
      setForm({ nome: '', modality: 'ONLINE', duracaoHoras: '' });
      setFin({ nome: 'Plano Padrão', valorTotal: '', numeroParcelas: '', diaVencimento: '', jurosAoMes: '0', multaPercent: '0' });
      setWithFin(true);
      await qc.invalidateQueries({ queryKey: ['cursos'] });
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Erro ao criar curso');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setPendingDeleteId(id);
    await deleteCurso(id);
    await qc.invalidateQueries({ queryKey: ['cursos'] });
    setOpenModal(false);
    setPendingDeleteId(null);
  }

  const total = data?.total ?? 0;
  const perPage = data?.perPage ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-semibold">Cursos</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por nome…"
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
          />
          <Button onClick={() => setOpen(true)}><Plus size={16}/> Novo curso</Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[color:var(--text-muted)]">
                <th className="py-2">Nome</th>
                <th className="py-2">Modalidade</th>
                <th className="py-2">Duração (h)</th>
                <th className="py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((c: Curso) => (
                <tr key={c.id} className="border-t border-black/5">
                  <td className="py-3">{c.nome}</td>
                  <td className="py-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                      {c.modality}
                    </span>
                  </td>
                  <td className="py-3">{c.duracaoHoras ?? '—'}</td>
                  <td className="py-3">
                    <button
                      className="btn btn-ghost text-red-600"
                      title="Excluir"
                      onClick={() => { setPendingDeleteId(c.id); setOpenModal(true); }}
                    >
                      <Trash2 size={16}/>
                    </button>
                    <ConfirmModal
                      open={openModal && pendingDeleteId === c.id}
                      onConfirm={() => handleDelete(c.id)}
                      onCancel={() => setOpenModal(false)}
                    />
                  </td>
                </tr>
              ))}
              {!isFetching && data?.data?.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-[color:var(--text-muted)]">Nenhum curso encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-[color:var(--text-muted)]">
            {isFetching ? 'Atualizando…' : `${data?.data?.length ?? 0} / ${total} itens`}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >Anterior</button>
            <div className="text-sm">{page} / {totalPages}</div>
            <button
              className="btn btn-ghost"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >Próxima</button>
          </div>
        </div>
      </Card>

      {/* Modal de criação */}
      {open && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
          <div className="card w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Novo curso</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <div className="label">Nome</div>
                <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="label">Modalidade</div>
                  <select
                    className="input"
                    value={form.modality}
                    onChange={(e) => setForm({ ...form, modality: e.target.value as 'ONLINE'|'PRESENCIAL' })}
                  >
                    <option value="ONLINE">ONLINE</option>
                    <option value="PRESENCIAL">PRESENCIAL</option>
                  </select>
                </div>
                <div>
                  <div className="label">Duração (horas) — opcional</div>
                  <Input
                    type="number"
                    min={1}
                    value={form.duracaoHoras as any}
                    onChange={(e) => setForm({ ...form, duracaoHoras: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Financeiro */}
              <div className="mt-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={withFin}
                    onChange={(e) => setWithFin(e.target.checked)}
                  />
                  Criar com financeiro
                </label>
              </div>

              {withFin && (
                <div className="rounded-lg border border-black/10 dark:border-white/10 p-3 space-y-3">
                  <div>
                    <div className="label">Nome do plano</div>
                    <Input value={fin.nome} onChange={e => setFin({ ...fin, nome: e.target.value })} required />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="label">Valor total (R$)</div>
                      <Input
                        placeholder="Ex.: 1200,00"
                        value={fin.valorTotal}
                        onChange={(e) => setFin({ ...fin, valorTotal: e.target.value })}
                        required
                      />
                      <p className="text-xs text-[color:var(--text-muted)] mt-1">Use ponto ou vírgula para decimais.</p>
                    </div>
                    <div>
                      <div className="label">Nº parcelas</div>
                      <Input
                        type="number"
                        min={1}
                        value={fin.numeroParcelas as any}
                        onChange={(e) => setFin({ ...fin, numeroParcelas: e.target.value === '' ? '' : Number(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="label">Dia vencimento (1–28) — opcional</div>
                      <Input
                        type="number"
                        min={1}
                        max={28}
                        value={fin.diaVencimento as any}
                        onChange={(e) => setFin({ ...fin, diaVencimento: e.target.value === '' ? '' : Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <div className="label">Juros % ao mês</div>
                      <Input
                        placeholder="0"
                        value={fin.jurosAoMes}
                        onChange={(e) => setFin({ ...fin, jurosAoMes: e.target.value })}
                      />
                    </div>
                    <div>
                      <div className="label">Multa %</div>
                      <Input
                        placeholder="0"
                        value={fin.multaPercent}
                        onChange={(e) => setFin({ ...fin, multaPercent: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {err && <p className="text-red-600 text-sm">{err}</p>}

              <div className="flex items-center justify-end gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                <Button disabled={creating}>{creating ? 'Salvando…' : 'Salvar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
