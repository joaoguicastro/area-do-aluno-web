/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listTurmas, createTurma, deleteTurma } from '../../../services/turmas';
import type { Turma } from '../../../services/turmas';
import { listCursos } from '../../../services/cursos';
import type { Curso } from '../../../services/cursos';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { useDebounce } from '../../../utils/useDebounce';
import { Plus, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../../../ui/Delete';

export default function TurmasList() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q);
  const [openModal, setOpenModal] = useState(false);

  const turmasQuery = useQuery({
    queryKey: ['turmas', { q: debounced, page }],
    queryFn: () => listTurmas({ q: debounced || undefined, page, perPage: 10 }),
    staleTime: 1000 * 10,
  });

  // cursos para o select do modal
  const cursosQuery = useQuery({
    queryKey: ['cursos-for-select'],
    queryFn: () => listCursos({ perPage: 100 }),
    staleTime: 1000 * 60 * 5,
  });

  const cursosMap = useMemo(() => {
    const m: Record<string, string> = {};
    cursosQuery.data?.data?.forEach((c: Curso) => {
      m[c.id] = c.nome;
    });
    return m;
  }, [cursosQuery.data]);

  if (turmasQuery.error) {
    return (
      <div className="p-4">
        <p className="text-red-600">Erro ao carregar turmas.</p>
      </div>
    );
  }

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    nome: string;
    cursoId: string;
    dataInicio: string;
    dataFim: string;
  }>({
    nome: '',
    cursoId: '',
    dataInicio: '',
    dataFim: '',
  });
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // refetch de cursos sempre que abrir o modal
  useEffect(() => {
    if (open) {
      cursosQuery.refetch();
    }
  }, [open, cursosQuery]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || !form.cursoId) return;

    setCreating(true);
    setErr(null);
    try {
      await createTurma({
        nome: form.nome.trim(),
        cursoId: form.cursoId,
        dataInicio: form.dataInicio ? form.dataInicio : null,
        dataFim: form.dataFim ? form.dataFim : null,
      });
      setOpen(false);
      setForm({ nome: '', cursoId: '', dataInicio: '', dataFim: '' });

      // atualiza listas pós-criação
      await qc.invalidateQueries({ queryKey: ['turmas'] });
      await qc.invalidateQueries({ queryKey: ['cursos-for-select'] });
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Erro ao criar turma');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteTurma(id);
    await qc.invalidateQueries({ queryKey: ['turmas'] });
    setOpenModal(false);
  }

  const data = turmasQuery.data;
  const total = data?.total ?? 0;
  const perPage = data?.perPage ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-semibold">Turmas</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por nome…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
          <Button
            onClick={async () => {
              // invalida a lista de cursos antes de abrir o modal
              await qc.invalidateQueries({ queryKey: ['cursos-for-select'] });
              setOpen(true);
            }}
          >
            <Plus size={16} /> Nova turma
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[color:var(--text-muted)]">
                <th className="py-2">Nome</th>
                <th className="py-2">Curso</th>
                <th className="py-2">Início</th>
                <th className="py-2">Fim</th>
                <th className="py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((t: Turma) => (
                <tr key={t.id} className="border-t border-black/5">
                  <td className="py-3">{t.nome}</td>
                  <td className="py-3">
                    {t.cursoNome ?? cursosMap[t.cursoId] ?? t.cursoId}
                  </td>
                  <td className="py-3">
                    {t.dataInicio ? new Date(t.dataInicio).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-3">
                    {t.dataFim ? new Date(t.dataFim).toLocaleDateString() : '—'}
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
                      onCancel={() => setOpenModal(false)}
                      onConfirm={() => handleDelete(t.id)}
                    />
                  </td>
                </tr>
              ))}
              {!turmasQuery.isFetching && (data?.data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[color:var(--text-muted)]">
                    Nenhuma turma encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-[color:var(--text-muted)]">
            {turmasQuery.isFetching ? 'Atualizando…' : `${data?.data?.length ?? 0} / ${total} itens`}
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
          <div className="card w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Nova turma</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <div className="label">Nome</div>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  required
                />
              </div>

              <div>
                <div className="label">Curso</div>
                <select
                  className="input"
                  value={form.cursoId}
                  onChange={(e) => setForm({ ...form, cursoId: e.target.value })}
                  onFocus={() => cursosQuery.refetch()}
                  required
                >
                  <option value="" disabled>
                    Selecione um curso
                  </option>
                  {cursosQuery.data?.data?.map((c: Curso) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setOpen(false)}
                >
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
