/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listProvas, createProva, publishProva, type Prova } from '../../../services/provas';
import { listCursos, type Curso } from '../../../services/cursos';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { useDebounce } from '../../../utils/useDebounce';
import { Plus, UploadCloud, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProvasList() {
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

  const provasQuery = useQuery({
    queryKey: ['provas', { q: debounced, page, cursoId: cursoFiltro || undefined }],
    queryFn: () => listProvas({ q: debounced || undefined, page, perPage: 10, cursoId: cursoFiltro || undefined }),
    staleTime: 1000 * 10,
  });

  const data = provasQuery.data;
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
    inicioEm: string;
    fimEm: string;
    duracaoMin: string;
    publicado: boolean;
  }>({
    cursoId: '',
    titulo: '',
    descricao: '',
    inicioEm: '',
    fimEm: '',
    duracaoMin: '',
    publicado: false,
  });

  useEffect(() => {
    if (!open) return;
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
      await createProva({
        cursoId: form.cursoId,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        inicioEm: form.inicioEm || null,
        fimEm: form.fimEm || null,
        duracaoMin: form.duracaoMin ? Number(form.duracaoMin) : null,
        publicado: form.publicado,
      });
      setOpen(false);
      setForm({ cursoId: '', titulo: '', descricao: '', inicioEm: '', fimEm: '', duracaoMin: '', publicado: false });
      await qc.invalidateQueries({ queryKey: ['provas'] });
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Erro ao criar prova');
    } finally {
      setCreating(false);
    }
  }

  async function handlePublish(id: string) {
    await publishProva(id);
    await qc.invalidateQueries({ queryKey: ['provas'] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-semibold">Provas</h1>
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
            <Plus size={16} /> Nova prova
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
                <th className="py-2">Janela</th>
                <th className="py-2">Duração</th>
                <th className="py-2">Publicado</th>
                <th className="py-2 w-40"></th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((p: Prova) => (
                <tr key={p.id} className="border-t border-black/5">
                  <td className="py-3">{p.titulo}</td>
                  <td className="py-3">{p.cursoNome ?? p.cursoId}</td>
                  <td className="py-3">
                    {(p.inicioEm ? new Date(p.inicioEm).toLocaleDateString() : '—')}
                    {' '}→{' '}
                    {(p.fimEm ? new Date(p.fimEm).toLocaleDateString() : '—')}
                  </td>
                  <td className="py-3">{p.duracaoMin ?? '—'} min</td>
                  <td className="py-3">
                    <span className={`inline-block px-2 py-0.5 rounded ${p.publicado ? 'bg-green-100 text-green-700' : 'bg-black/5 dark:bg-white/10'}`}>
                      {p.publicado ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      {!p.publicado && (
                        <button className="btn btn-ghost" onClick={() => handlePublish(p.id)} title="Publicar">
                          <UploadCloud size={16} /> Publicar
                        </button>
                      )}
                      <Link to={`/admin/provas/${p.id}/questoes`} className="btn btn-ghost" title="Gerenciar questões">
                        <ListChecks size={16} /> Questões
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {!provasQuery.isFetching && (data?.data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[color:var(--text-muted)]">
                    Nenhuma prova encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-[color:var(--text-muted)]">
            {provasQuery.isFetching ? 'Atualizando…' : `${data?.data?.length ?? 0} / ${total} itens`}
          </div>
        </div>
      </Card>

      {/* Modal de criação */}
      {open && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
          <div className="card w-full max-w-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Nova prova</h2>
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
                  <div className="label">Duração (minutos) — opcional</div>
                  <Input
                    type="number"
                    min={1}
                    value={form.duracaoMin}
                    onChange={(e) => setForm({ ...form, duracaoMin: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <div className="label">Título</div>
                <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
              </div>

              <div>
                <div className="label">Descrição (opcional)</div>
                <textarea
                  className="input min-h-[120px]"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="label">Início (opcional)</div>
                  <Input type="date" value={form.inicioEm} onChange={(e) => setForm({ ...form, inicioEm: e.target.value })} />
                </div>
                <div>
                  <div className="label">Fim (opcional)</div>
                  <Input type="date" value={form.fimEm} onChange={(e) => setForm({ ...form, fimEm: e.target.value })} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="prova-pub"
                  type="checkbox"
                  checked={form.publicado}
                  onChange={(e) => setForm({ ...form, publicado: e.target.checked })}
                />
                <label htmlFor="prova-pub" className="select-none">Publicar imediatamente</label>
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
