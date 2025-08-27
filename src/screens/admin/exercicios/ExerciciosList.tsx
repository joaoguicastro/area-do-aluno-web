/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listExercicios, createExercicio, publishExercicio, type Exercicio } from '../../../services/exercicios';
import { listCursos, type Curso } from '../../../services/cursos';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Input } from '../../..//ui/Input';
import { useDebounce } from '../../../utils/useDebounce';
import { Plus, UploadCloud } from 'lucide-react';

export default function ExerciciosList() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [cursoFiltro, setCursoFiltro] = useState<string>('');
  const debounced = useDebounce(q);

  const cursosQuery = useQuery({
    queryKey: ['cursos-for-select'],
    queryFn: () => listCursos({ perPage: 200 }),
    staleTime: 1000 * 60 * 5,
  });

  const exerciciosQuery = useQuery({
    queryKey: ['exercicios', { q: debounced, page, cursoId: cursoFiltro || undefined }],
    queryFn: () => listExercicios({ q: debounced || undefined, page, perPage: 10, cursoId: cursoFiltro || undefined }),
    staleTime: 1000 * 10,
  });

  const data = exerciciosQuery.data;
  const total = data?.total ?? 0;
  const perPage = data?.perPage ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<{
    cursoId: string;
    titulo: string;
    descricao: string;
    dataEntrega: string;
    publicado: boolean;
  }>({
    cursoId: '',
    titulo: '',
    descricao: '',
    dataEntrega: '',
    publicado: false,
  });

  useEffect(() => {
    if (!open) return;
    // defaulta curso se houver apenas um ou se filtro estiver setado
    if (!form.cursoId && (cursoFiltro || (cursosQuery.data?.data?.length === 1))) {
      setForm((f) => ({
        ...f,
        cursoId: cursoFiltro || cursosQuery.data!.data[0].id,
      }));
    }
  }, [open, cursoFiltro, cursosQuery.data, form.cursoId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cursoId || !form.titulo.trim()) return;
    setCreating(true); setErr(null);
    try {
      await createExercicio({
        cursoId: form.cursoId,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        dataEntrega: form.dataEntrega || null,
        publicado: form.publicado,
      });
      setOpen(false);
      setForm({ cursoId: '', titulo: '', descricao: '', dataEntrega: '', publicado: false });
      await qc.invalidateQueries({ queryKey: ['exercicios'] });
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Erro ao criar exercício');
    } finally {
      setCreating(false);
    }
  }

  async function handlePublish(id: string) {
    await publishExercicio(id);
    await qc.invalidateQueries({ queryKey: ['exercicios'] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-semibold">Exercícios</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <select
            className="input"
            value={cursoFiltro}
            onChange={(e) => { setCursoFiltro(e.target.value); setPage(1); }}
          >
            <option value="">Todos os cursos</option>
            {cursosQuery.data?.data?.map((c: Curso) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          <Input
            placeholder="Buscar por título…"
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
          />
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Novo exercício
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[color:var(--text-muted)]">
                <th className="py-2">Título</th>
                <th className="py-2">Curso</th>
                <th className="py-2">Entrega</th>
                <th className="py-2">Publicado</th>
                <th className="py-2 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((e: Exercicio) => (
                <tr key={e.id} className="border-t border-black/5">
                  <td className="py-3">{e.titulo}</td>
                  <td className="py-3">{e.cursoNome ?? e.cursoId}</td>
                  <td className="py-3">{e.dataEntrega ? new Date(e.dataEntrega).toLocaleDateString() : '—'}</td>
                  <td className="py-3">
                    <span className={`inline-block px-2 py-0.5 rounded ${e.publicado ? 'bg-green-100 text-green-700' : 'bg-black/5 dark:bg-white/10'}`}>
                      {e.publicado ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="py-3">
                    {!e.publicado && (
                      <button className="btn btn-ghost" onClick={() => handlePublish(e.id)} title="Publicar">
                        <UploadCloud size={16} /> Publicar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!exerciciosQuery.isFetching && (data?.data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[color:var(--text-muted)]">
                    Nenhum exercício encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-[color:var(--text-muted)]">
            {exerciciosQuery.isFetching ? 'Atualizando…' : `${data?.data?.length ?? 0} / ${total} itens`}
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
            <h2 className="text-lg font-semibold mb-4">Novo exercício</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="label">Curso</div>
                  <select
                    className="input"
                    value={form.cursoId}
                    onChange={(e) => setForm({ ...form, cursoId: e.target.value })}
                    required
                  >
                    <option value="" disabled>Selecione um curso</option>
                    {cursosQuery.data?.data?.map((c: Curso) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="label">Data de entrega (opcional)</div>
                  <Input
                    type="date"
                    value={form.dataEntrega}
                    onChange={(e) => setForm({ ...form, dataEntrega: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <div className="label">Título</div>
                <Input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  required
                />
              </div>

              <div>
                <div className="label">Descrição (opcional)</div>
                <textarea
                  className="input min-h-[120px]"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Instruções do exercício, links, anexos etc."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="ex-pub"
                  type="checkbox"
                  checked={form.publicado}
                  onChange={(e) => setForm({ ...form, publicado: e.target.checked })}
                />
                <label htmlFor="ex-pub" className="select-none">Publicar imediatamente</label>
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
