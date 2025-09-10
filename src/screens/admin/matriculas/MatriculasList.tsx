/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listMatriculas,
  createMatricula,
  deleteMatricula,
  listParcelasByMatricula,
  baixaParcela,
  estornarParcela,
  type Matricula,
  type MatriculaStatus,
  type Parcela,
  type FormaPagamento,
} from '../../../services/matriculas';
import { listAlunos, type Aluno } from '../../../services/alunos';
import { listCursos, type Curso } from '../../../services/cursos';
import { getTurmaById, listTurmasByCursoId, type Turma } from '../../../services/turmas';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { useDebounce } from '../../../utils/useDebounce';
import { Plus, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../../../ui/Delete';

function formatISODate(iso?: string | null) {
  if (!iso) return '—';
  const ymd = iso.split('T')[0];
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return '—';
  return `${d}/${m}/${y}`;
}

function formatBRL(n?: number | null) {
  if (n == null) return '—';
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n); }
  catch { return String(n); }
}

export default function MatriculasList() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const debounced = useDebounce(q);

  // 🔹 Busca TODAS as matrículas (sem paginação server-side)
  const { data: allMatriculas, isFetching, error } = useQuery({
    queryKey: ['matriculas', { refresh: true }],
    queryFn: () => listMatriculas(),
    staleTime: 10_000,
  });

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-600">Erro ao carregar matrículas.</p>
      </div>
    );
  }

  // dados para selects (listas curtas)
  const alunosQuery = useQuery({
    queryKey: ['alunos-for-select'],
    queryFn: () => listAlunos({ perPage: 100 }),
    staleTime: 1000 * 60 * 5,
  });
  const cursosQuery = useQuery({
    queryKey: ['cursos-for-select'],
    queryFn: () => listCursos({ perPage: 100 }),
    staleTime: 1000 * 60 * 5,
  });

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState<{
    alunoId: string;
    cursoId: string;
    turmaId: string;
    status: MatriculaStatus;
    dataInicio: string;
    dataFim: string;
  }>({
    alunoId: '',
    cursoId: '',
    turmaId: '',
    status: 'ATIVA',
    dataInicio: '',
    dataFim: '',
  });

  // 🔁 Busca turmas do curso selecionado (para o select)
  const turmasQuery = useQuery({
    queryKey: ['turmas-by-curso', form.cursoId],
    queryFn: async () => {
      if (!form.cursoId) return [] as Turma[];
      const itens = await listTurmasByCursoId(form.cursoId);
      return itens;
    },
    enabled: !!form.cursoId,
    staleTime: 1000 * 60 * 2,
  });

  const turmasFiltradas = turmasQuery.data ?? [];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.alunoId || !form.cursoId) return;

    setCreating(true);
    setErr(null);
    try {
      await createMatricula({
        alunoId: form.alunoId,
        cursoId: form.cursoId,
        turmaId: form.turmaId || null,
        status: form.status,
        dataInicio: form.dataInicio || null,
        dataFim: form.dataFim || null,
      });
      setOpen(false);
      setForm({
        alunoId: '',
        cursoId: '',
        turmaId: '',
        status: 'ATIVA',
        dataInicio: '',
        dataFim: '',
      });
      await qc.invalidateQueries({ queryKey: ['matriculas'] });
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Erro ao criar matrícula');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setPendingDeleteId(id);
    await deleteMatricula(id);
    await qc.invalidateQueries({ queryKey: ['matriculas'] });
    setOpenModal(false);
    setPendingDeleteId(null);
  }

  const cursosMap = useMemo(() => {
    const m: Record<string, string> = {};
    cursosQuery.data?.data?.forEach((c: Curso) => {
      m[c.id] = c.nome;
    });
    return m;
  }, [cursosQuery.data]);

  const alunosMap = useMemo(() => {
    const m: Record<string, string> = {};
    alunosQuery.data?.data?.forEach((a: Aluno) => {
      m[a.id] = a.nome;
    });
    return m;
  }, [alunosQuery.data]);

  // 🔎 Filtro por texto (cliente)
  const filtered: Matricula[] = useMemo(() => {
    const base = allMatriculas ?? [];
    const term = debounced.trim().toLowerCase();
    if (!term) return base;

    return base.filter((m) => {
      const aluno = m.alunoNome ?? alunosMap[m.alunoId] ?? m.alunoId;
      const curso = m.cursoNome ?? cursosMap[m.cursoId] ?? m.cursoId;
      const turma = m.turmaNome ?? m.turmaId ?? '';
      return (
        String(aluno).toLowerCase().includes(term) ||
        String(curso).toLowerCase().includes(term) ||
        String(turma).toLowerCase().includes(term)
      );
    });
  }, [allMatriculas, debounced, alunosMap, cursosMap]);

  // 📄 Paginação no cliente
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);

  // ids de turmas presentes NA PÁGINA (para map de nomes)
  const turmaIdsFromTable = useMemo(() => {
    const set = new Set<string>();
    pageItems.forEach((m: Matricula) => {
      if (m.turmaId) set.add(m.turmaId);
    });
    return Array.from(set);
  }, [pageItems]);

  type TurmaNameMap = Record<string, string>;

  const turmasByIdsQuery = useQuery({
    queryKey: ['turmas-by-ids', turmaIdsFromTable],
    // retorna um MAP pronto { id: nome }
    queryFn: async (): Promise<TurmaNameMap> => {
      const ids = turmaIdsFromTable.filter(Boolean);
      if (ids.length === 0) return {};
      const turmas = await Promise.all(ids.map((id) => getTurmaById(id)));
      const map: TurmaNameMap = {};
      turmas.forEach((t) => {
        if (t?.id && t?.nome) map[t.id] = t.nome;
      });
      return map;
    },
    enabled: turmaIdsFromTable.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const turmasMap = useMemo(() => {
    const m: Record<string, string> = {};
    // nomes vindos dos ids presentes na TABELA (página atual)
    Object.assign(m, turmasByIdsQuery.data ?? {});
    // nomes vindos do curso selecionado (útil para o select do modal)
    (turmasQuery.data ?? []).forEach((t: Turma) => {
      if (t?.id && t?.nome) m[t.id] = t.nome;
    });
    return m;
  }, [turmasByIdsQuery.data, turmasQuery.data]);

  /* ---------------------- Parcelas Modal ---------------------- */

  const [parcelasOpen, setParcelasOpen] = useState(false);
  const [selected, setSelected] = useState<Matricula | null>(null);

  const parcelasQuery = useQuery({
    queryKey: ['parcelas-by-matricula', selected?.id],
    queryFn: () => listParcelasByMatricula(selected!.id),
    enabled: parcelasOpen && !!selected?.id,
    staleTime: 1000 * 10,
  });

  const [baixaForm, setBaixaForm] = useState<Record<string, {
    formaPagamento: FormaPagamento;
    valorPago: string;
    pagoEm?: string;
  }>>({});

  function openParcelas(m: Matricula) {
    setSelected(m);
    setParcelasOpen(true);
  }

  async function handleBaixa(p: Parcela) {
    const f = baixaForm[p.id] ?? { formaPagamento: 'DINHEIRO', valorPago: String(p.valor) };
    const valor = parseFloat((f.valorPago ?? '').replace(',', '.'));
    if (!Number.isFinite(valor) || valor <= 0) return alert('Informe um valor pago válido.');

    await baixaParcela(p.id, {
      formaPagamento: f.formaPagamento,
      valorPago: valor,
      pagoEm: f.pagoEm || undefined,
    });
    await qc.invalidateQueries({ queryKey: ['parcelas-by-matricula', selected?.id] });
    await qc.invalidateQueries({ queryKey: ['matriculas'] });
  }

  async function handleEstorno(p: Parcela) {
    await estornarParcela(p.id);
    await qc.invalidateQueries({ queryKey: ['parcelas-by-matricula', selected?.id] });
    await qc.invalidateQueries({ queryKey: ['matriculas'] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-semibold">Matrículas</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por aluno, curso, turma…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Nova matrícula
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[color:var(--text-muted)]">
                <th className="py-2">Aluno</th>
                <th className="py-2">Curso</th>
                <th className="py-2">Turma</th>
                <th className="py-2">Início</th>
                <th className="py-2">Fim</th>
                <th className="py-2">Status</th>
                <th className="py-2 w-48"></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((m: Matricula) => (
                <tr key={m.id} className="border-t border-black/5">
                  <td className="py-3">{m.alunoNome ?? alunosMap[m.alunoId] ?? m.alunoId}</td>
                  <td className="py-3">{m.cursoNome ?? cursosMap[m.cursoId] ?? m.cursoId}</td>
                  <td className="py-3">
                    {m.turmaNome ?? (m.turmaId ? turmasMap[m.turmaId] : undefined) ?? (m.turmaId || '-')}
                  </td>
                  <td className="py-3">{formatISODate(m.dataInicio)}</td>
                  <td className="py-3">{formatISODate(m.dataFim)}</td>
                  <td className="py-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="btn btn-ghost"
                        onClick={() => openParcelas(m)}
                      >
                        Parcelas
                      </button>

                      <button
                        className="btn btn-ghost text-red-600"
                        title="Excluir"
                        onClick={() => { setPendingDeleteId(m.id); setOpenModal(true); }}
                      >
                        <Trash2 size={16} />
                      </button>
                      <ConfirmModal
                        open={openModal && pendingDeleteId === m.id}
                        onConfirm={() => handleDelete(m.id)}
                        onCancel={() => setOpenModal(false)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!isFetching && pageItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[color:var(--text-muted)]">
                    Nenhuma matrícula encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação cliente */}
        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-[color:var(--text-muted)]">
            {isFetching ? 'Atualizando…' : `${pageItems.length} / ${total} itens`}
          </div>
          <div className="flex items-center gap-3">
            <select
              className="input h-9"
              value={perPage}
              onChange={(e) => { setPage(1); setPerPage(parseInt(e.target.value, 10)); }}
            >
              {[10, 15, 20, 25, 50].map(n => <option key={n} value={n}>{n} por página</option>)}
            </select>
            <button
              className="btn btn-ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <div className="text-sm">
              {page} / {totalPages}
            </div>
            <button
              className="btn btn-ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Próxima
            </button>
          </div>
        </div>
      </Card>

      {/* Modal: Nova matrícula */}
      {open && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
          <div className="card w-full max-w-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Nova matrícula</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="label">Aluno</div>
                  <select
                    className="input"
                    value={form.alunoId}
                    onChange={(e) => setForm({ ...form, alunoId: e.target.value })}
                    required
                  >
                    <option value="" disabled>Selecione um aluno</option>
                    {alunosQuery.data?.data?.map((a: Aluno) => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="label">Curso</div>
                  <select
                    className="input"
                    value={form.cursoId}
                    onChange={(e) => {
                      setForm({ ...form, cursoId: e.target.value, turmaId: '' });
                    }}
                    required
                  >
                    <option value="" disabled>Selecione um curso</option>
                    {cursosQuery.data?.data?.map((c: Curso) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <div className="label">Turma (opcional)</div>
                  <select
                    className="input"
                    value={form.turmaId}
                    onChange={(e) => setForm({ ...form, turmaId: e.target.value })}
                    disabled={!form.cursoId || turmasQuery.isFetching}
                  >
                    <option value="">Sem turma</option>
                    {turmasFiltradas.map((t: Turma) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                  {form.cursoId && turmasQuery.isFetching && (
                    <p className="text-xs text-[color:var(--text-muted)] mt-1">Carregando turmas…</p>
                  )}
                  {form.cursoId && !turmasQuery.isFetching && turmasFiltradas.length === 0 && (
                    <p className="text-xs text-[color:var(--text-muted)] mt-1">Nenhuma turma para este curso.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="label">Status</div>
                  <select
                    className="input"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as MatriculaStatus })}
                  >
                    <option value="ATIVA">ATIVA</option>
                    <option value="TRANCADA">TRANCADA</option>
                    <option value="CANCELADA">CANCELADA</option>
                    <option value="CONCLUIDA">CONCLUIDA</option>
                  </select>
                </div>
                <div>
                  <div className="label">Data de início</div>
                  <Input
                    type="date"
                    value={form.dataInicio}
                    onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
                  />
                </div>
                <div>
                  <div className="label">Data de término</div>
                  <Input
                    type="date"
                    value={form.dataFim}
                    onChange={(e) => setForm({ ...form, dataFim: e.target.value })}
                  />
                </div>
              </div>

              {err && <p className="text-red-600 text-sm">{err}</p>}

              <div className="flex items-center justify-end gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <Button disabled={creating}>{creating ? 'Salvando…' : 'Salvar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Parcelas da matrícula */}
      {parcelasOpen && selected && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
          <div className="card w-full max-w-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Parcelas — {alunosMap[selected.alunoId] ?? selected.alunoId} / {cursosMap[selected.cursoId] ?? selected.cursoId}
              </h2>
              <button className="btn btn-ghost" onClick={() => setParcelasOpen(false)}>Fechar</button>
            </div>

            {parcelasQuery.isLoading ? (
              <p>Carregando…</p>
            ) : parcelasQuery.data && parcelasQuery.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[color:var(--text-muted)]">
                      <th className="py-2">#</th>
                      <th className="py-2">Vencimento</th>
                      <th className="py-2">Valor</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Pagamento</th>
                      <th className="py-2 w-64">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parcelasQuery.data.map((p: Parcela) => (
                      <tr key={p.id} className="border-t border-black/5 align-top">
                        <td className="py-2">{p.numero}</td>
                        <td className="py-2">{formatISODate(p.vencimento)}</td>
                        <td className="py-2">{formatBRL(p.valor)}</td>
                        <td className="py-2">
                          <span className="inline-block px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2">
                          {p.status === 'PAGA' ? (
                            <div className="text-xs">
                              <div><b>Forma:</b> {p.formaPagamento ?? '-'}</div>
                              <div><b>Pago em:</b> {formatISODate(p.pagoEm)}</div>
                              <div><b>Valor pago:</b> {formatBRL(p.valorPago ?? undefined)}</div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              <select
                                className="input"
                                value={baixaForm[p.id]?.formaPagamento ?? 'DINHEIRO'}
                                onChange={(e) => setBaixaForm(s => ({ 
                                  ...s, 
                                  [p.id]: { 
                                    ...(s[p.id] ?? { valorPago: String(p.valor) }), 
                                    formaPagamento: e.target.value as FormaPagamento 
                                  } 
                                }))}
                              >
                                <option value="DINHEIRO">DINHEIRO</option>
                                <option value="PIX">PIX</option>
                                <option value="CARTAO_CREDITO">CARTÃO CRÉDITO</option>
                                <option value="BOLETO">BOLETO</option>
                              </select>
                              <Input
                                placeholder={String(p.valor)}
                                value={baixaForm[p.id]?.valorPago ?? String(p.valor)}
                                onChange={(e) => setBaixaForm(s => ({ 
                                  ...s, 
                                  [p.id]: { ...(s[p.id] ?? { formaPagamento: 'DINHEIRO' }), valorPago: e.target.value } 
                                }))}
                              />
                              <Input
                                type="datetime-local"
                                value={baixaForm[p.id]?.pagoEm ?? ''}
                                onChange={(e) => setBaixaForm(s => ({ 
                                  ...s, 
                                  [p.id]: { ...(s[p.id] ?? { formaPagamento: 'DINHEIRO', valorPago: String(p.valor) }), pagoEm: e.target.value } 
                                }))}
                              />
                            </div>
                          )}
                        </td>
                        <td className="py-2">
                          {p.status === 'ABERTA' ? (
                            <div className="flex gap-2">
                              <Button onClick={() => handleBaixa(p)}>Dar baixa</Button>
                            </div>
                          ) : p.status === 'PAGA' ? (
                            <button className="btn btn-ghost text-red-600" onClick={() => handleEstorno(p)}>
                              Estornar
                            </button>
                          ) : (
                            <span className="text-xs text-[color:var(--text-muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Nenhuma parcela gerada.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
