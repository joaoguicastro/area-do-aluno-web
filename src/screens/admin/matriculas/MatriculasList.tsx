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

/* ---------------------- Utils ---------------------- */
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

function norm(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/* ---------------------- Pagination (front) ---------------------- */
function Pagination({
  page,
  total,
  perPage = 10,
  onChange,
  disabled = false,
}: {
  page: number;
  total: number;
  perPage?: number;
  onChange: (p: number) => void;
  disabled?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const go = (p: number) => {
    if (disabled) return;
    const clamped = Math.max(1, Math.min(totalPages, p));
    if (clamped !== page) onChange(clamped);
  };

  const pages: (number | '...')[] = [];
  const win = 1;
  const push = (v: number | '...') => pages[pages.length - 1] !== v && pages.push(v);

  for (let p = 1; p <= totalPages; p++) {
    const edge = p === 1 || p === totalPages;
    const near = Math.abs(p - page) <= win;
    if (edge || near) push(p);
    else if (pages[pages.length - 1] !== '...') push('...');
  }

  return (
    <div className="flex items-center justify-between mt-3">
      <div className="text-xs text-[color:var(--text-muted)]">
        {disabled ? 'Atualizando…' : `Página ${page} de ${totalPages} • ${perPage} por página • Total: ${total}`}
      </div>
      <div className="flex items-center gap-1">
        <button className="btn btn-ghost" onClick={() => go(1)} disabled={disabled || page <= 1} title="Primeira">«</button>
        <button className="btn btn-ghost" onClick={() => go(page - 1)} disabled={disabled || page <= 1} title="Anterior">‹</button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-2 text-sm text-[color:var(--text-muted)]">…</span>
          ) : (
            <button
              key={p}
              className={`btn btn-ghost ${p === page ? 'bg-black/5 dark:bg-white/10' : ''}`}
              onClick={() => go(p)}
              disabled={disabled || p === page}
              title={`Página ${p}`}
            >
              {p}
            </button>
          )
        )}
        <button className="btn btn-ghost" onClick={() => go(page + 1)} disabled={disabled || page === totalPages} title="Próxima">›</button>
        <button className="btn btn-ghost" onClick={() => go(totalPages)} disabled={disabled || page === totalPages} title="Última">»</button>
      </div>
    </div>
  );
}

/* ====================== COMPONENTE ====================== */
export default function MatriculasList() {
  const qc = useQueryClient();

  /* ---- Busca e paginação (FRONT) ---- */
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;
  const debounced = useDebounce(q, 300);

  // carrega TODAS as matrículas (sem paginação no back)
  const { data: rawResp, isFetching, error } = useQuery({
    queryKey: ['matriculas-all'],
    queryFn: () => listMatriculas(), // sem page/perPage -> tudo
    staleTime: 1000 * 10,
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
      await qc.invalidateQueries({ queryKey: ['matriculas-all'] });
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Erro ao criar matrícula');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setPendingDeleteId(id);
    await deleteMatricula(id);
    await qc.invalidateQueries({ queryKey: ['matriculas-all'] });
    setOpenModal(false);
    setPendingDeleteId(null);
  }

  const cursosMap = useMemo(() => {
    const m: Record<string, string> = {};
    const arr = (cursosQuery.data as any)?.data ?? cursosQuery.data ?? [];
    arr?.forEach((c: Curso) => { if (c?.id) m[c.id] = c.nome; });
    return m;
  }, [cursosQuery.data]);

  const alunosMap = useMemo(() => {
    const m: Record<string, string> = {};
    const arr = (alunosQuery.data as any)?.data ?? alunosQuery.data ?? [];
    arr?.forEach((a: Aluno) => { if (a?.id) m[a.id] = a.nome; });
    return m;
  }, [alunosQuery.data]);

  // normaliza resposta do back (array puro OU {data: []})
  const allMatriculas: Matricula[] = useMemo(() => {
    const d = Array.isArray(rawResp) ? rawResp : (rawResp as any)?.data ?? [];
    return (d ?? []) as Matricula[];
  }, [rawResp]);

  // ids de turmas presentes na LISTA FILTRADA/PAGINADA (vamos buscar nomes p/ exibir)
  const turmaIdsFromAll = useMemo(() => {
    const set = new Set<string>();
    allMatriculas.forEach((m) => { if (m.turmaId) set.add(m.turmaId); });
    return Array.from(set);
  }, [allMatriculas]);

  type TurmaNameMap = Record<string, string>;

  const turmasByIdsQuery = useQuery({
    queryKey: ['turmas-by-ids', turmaIdsFromAll],
    queryFn: async (): Promise<TurmaNameMap> => {
      const ids = turmaIdsFromAll.filter(Boolean);
      if (ids.length === 0) return {};
      const turmas = await Promise.all(ids.map((id) => getTurmaById(id)));
      const map: TurmaNameMap = {};
      turmas.forEach((t) => { if (t?.id && t?.nome) map[t.id] = t.nome; });
      return map;
    },
    enabled: turmaIdsFromAll.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const turmasMap = useMemo(() => {
    const m: Record<string, string> = {};
    Object.assign(m, turmasByIdsQuery.data ?? {});
    (turmasQuery.data ?? []).forEach((t: Turma) => { if (t?.id && t?.nome) m[t.id] = t.nome; });
    return m;
  }, [turmasByIdsQuery.data, turmasQuery.data]);

  /* --------- FILTRO (front) + PAGINAÇÃO (front) --------- */
  const filtered: Matricula[] = useMemo(() => {
    const nq = norm(debounced);
    if (!nq) return allMatriculas;

    return allMatriculas.filter((m) => {
      const aluno = m.alunoNome ?? alunosMap[m.alunoId] ?? m.alunoId ?? '';
      const curso = m.cursoNome ?? cursosMap[m.cursoId] ?? m.cursoId ?? '';
      const turma = m.turmaNome ?? (m.turmaId ? (turmasMap[m.turmaId] ?? m.turmaId) : '') ?? '';
      const status = m.status ?? '';
      const texto = `${aluno} ${curso} ${turma} ${status} ${m.id ?? ''}`;
      return norm(texto).includes(nq);
    });
  }, [debounced, allMatriculas, alunosMap, cursosMap, turmasMap]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // clamp page quando filtro muda (evita ficar em página > totalPages)
  const safePage = Math.min(page, totalPages) || 1;
  const start = (safePage - 1) * perPage;
  const end = start + perPage;
  const pageItems = filtered.slice(start, end);

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
    await qc.invalidateQueries({ queryKey: ['matriculas-all'] });
  }

  async function handleEstorno(p: Parcela) {
    await estornarParcela(p.id);
    await qc.invalidateQueries({ queryKey: ['parcelas-by-matricula', selected?.id] });
    await qc.invalidateQueries({ queryKey: ['matriculas-all'] });
  }

  /* ---------------------- UI ---------------------- */
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-semibold">Matrículas</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="relative">
            <Input
              placeholder="Buscar por aluno, curso, turma…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1); // reset pagina quando busca muda
              }}
            />
            {q && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-[color:var(--text-muted)]"
                onClick={() => { setQ(''); setPage(1); }}
                title="Limpar"
              >
                ×
              </button>
            )}
          </div>
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
                      <button className="btn btn-ghost" onClick={() => openParcelas(m)}>Parcelas</button>
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
                    {debounced ? 'Nenhuma matrícula encontrada para o filtro.' : 'Nenhuma matrícula cadastrada.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* contador & paginação (FRONT) */}
        <div className="mt-2 text-xs text-[color:var(--text-muted)]">
          {isFetching
            ? 'Atualizando…'
            : `${pageItems.length} exibidas • ${total} ${debounced ? 'filtradas' : 'no total'}`}
        </div>

        <Pagination
          page={safePage}
          total={total}
          perPage={perPage}
          disabled={isFetching}
          onChange={(p) => setPage(p)}
        />
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
                    {(alunosQuery.data as any)?.data?.map((a: Aluno) => (
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
                    {(cursosQuery.data as any)?.data?.map((c: Curso) => (
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
