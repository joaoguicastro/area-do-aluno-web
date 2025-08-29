/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listMatriculas,
  createMatricula,
  deleteMatricula,
  type Matricula,
  type MatriculaStatus,
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
  const ymd = iso.split('T')[0]; // suporta 'YYYY-MM-DD' e 'YYYY-MM-DDTHH:mm:ssZ'
  const [y, m, d] = ymd.split('-');
  if (!y || !m || !d) return '—';
  return `${d}/${m}/${y}`;
}

export default function MatriculasList() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q);

  const { data, isFetching, error } = useQuery({
    queryKey: ['matriculas', { q: debounced, page }],
    queryFn: () => listMatriculas({ q: debounced || undefined, page, perPage: 10 }),
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
    await deleteMatricula(id);
    await qc.invalidateQueries({ queryKey: ['matriculas'] });
    setOpenModal(false);
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

  // ids de turmas presentes na TABELA (ignora null e repetidos)
  const turmaIdsFromTable = useMemo(() => {
    const set = new Set<string>();
    (data?.data ?? []).forEach((m: Matricula) => {
      if (m.turmaId) set.add(m.turmaId);
    });
    return Array.from(set);
  }, [data?.data]);

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
    // nomes vindos dos ids presentes na TABELA
    Object.assign(m, turmasByIdsQuery.data ?? {});
    // nomes vindos do curso selecionado (útil para o select do modal)
    (turmasQuery.data ?? []).forEach((t: Turma) => {
      if (t?.id && t?.nome) m[t.id] = t.nome;
    });
    return m;
  }, [turmasByIdsQuery.data, turmasQuery.data]);

  const total = data?.total ?? 0;
  const perPage = data?.perPage ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

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
                <th className="py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((m: Matricula) => (
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
                    <button
                      className="btn btn-ghost text-red-600"
                      title="Excluir"
                      onClick={() => setOpenModal(true)}
                    >
                      <Trash2 size={16} />
                    </button>

                    <ConfirmModal
                      open={openModal}
                      onConfirm={() => handleDelete(m.id)}
                      onCancel={() => setOpenModal(false)}
                    />
                  </td>
                </tr>
              ))}
              {!isFetching && (data?.data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[color:var(--text-muted)]">
                    Nenhuma matrícula encontrada.
                  </td>
                </tr>
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

      {/* Modal de criação */}
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
    </div>
  );
}
