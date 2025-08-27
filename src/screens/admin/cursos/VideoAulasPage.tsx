/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { listCursos, type Curso } from '../../../services/cursos';
import { addVideoAula, listVideoAulas, deleteVideoAula, type VideoAula } from '../../../services/videoaulas';
import { uploadVideo } from '../../../services/uploads';

import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { Textarea } from '../../../ui/Textarea';
import { Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';

export default function VideoAulasPage() {
  const qc = useQueryClient();
  const [cursoId, setCursoId] = useState('');
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const [form, setForm] = useState<{
    titulo: string;
    descricao: string;
    ordem: string;
    duracaoMin: string;
    file: File | null;
  }>({
    titulo: '',
    descricao: '',
    ordem: '',
    duracaoMin: '',
    file: null,
  });

  const cursosQuery = useQuery({
    queryKey: ['cursos-for-select'],
    queryFn: () => listCursos({ perPage: 100 }),
    staleTime: 1000 * 60 * 5,
  });

  const videosQuery = useQuery({
    queryKey: ['videoaulas', { cursoId }],
    queryFn: () => listVideoAulas(cursoId),
    enabled: !!cursoId,
    staleTime: 1000 * 30,
  });

  const videos = videosQuery.data?.data ?? [];

  async function handleCreate(e: React.FormEvent) {
  e.preventDefault();
  if (!cursoId) return setErr('Selecione um curso.');
  if (!form.titulo.trim()) return setErr('Informe o título.');
  if (!form.file) return setErr('Selecione um arquivo de vídeo.');

  setCreating(true);
  setErr(null);
  setProgress(0);
  try {
    // 1) Upload do arquivo
    const { url } = await uploadVideo(form.file, (p) => setProgress(p));

    // 2) Garanta URL ABSOLUTA p/ passar no z.string().url()
    const base = (api as any)?.defaults?.baseURL || window.location.origin;
    const absoluteUrl = url.startsWith('http') ? url : new URL(url, base).toString();

    // 3) Monte o payload SEM nulls (omitindo campos vazios)
    const payload: any = {
      titulo: form.titulo.trim(),
      urlVideo: absoluteUrl,
    };
    if (form.descricao.trim()) payload.descricao = form.descricao.trim();
    if (form.ordem) payload.ordem = Number(form.ordem);
    if (form.duracaoMin) payload.duracaoMin = Number(form.duracaoMin);

    // 4) Chama a rota existente
    await addVideoAula(cursoId, payload);

    setForm({ titulo: '', descricao: '', ordem: '', duracaoMin: '', file: null });
    setProgress(0);
    await qc.invalidateQueries({ queryKey: ['videoaulas', { cursoId }] });
  } catch (e: any) {
    setErr(e?.response?.data?.message ?? 'Erro ao enviar/criar vídeo-aula');
  } finally {
    setCreating(false);
  }
  }


  async function handleDelete(videoId: string) {
    if (!cursoId) return;
    if (!confirm('Excluir esta vídeo-aula?')) return;
    await deleteVideoAula(cursoId, videoId);
    await qc.invalidateQueries({ queryKey: ['videoaulas', { cursoId }] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-semibold">Vídeo-aulas por Curso</h1>
        <div className="flex-1" />
        <div className="w-full sm:w-80">
          <select
            className="input"
            value={cursoId}
            onChange={(e) => setCursoId(e.target.value)}
            onFocus={() => cursosQuery.refetch()}
          >
            <option value="">Selecione um curso</option>
            {cursosQuery.data?.data?.map((c: Curso) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <div className="label">Título *</div>
            <Input
              placeholder="Ex.: Aula 01 — Introdução"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              required
            />
          </div>

          <div className="md:col-span-2">
            <div className="label">Descrição (opcional)</div>
            <Textarea
              rows={3}
              placeholder="Breve descrição"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <div className="label">Arquivo de vídeo *</div>
            <input
              type="file"
              accept="video/*"
              className="input"
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
              required
            />
            {progress > 0 && (
              <div className="mt-2 text-xs text-[color:var(--text-muted)]">
                Enviando: {progress}%
                <div className="h-2 bg-black/10 dark:bg-white/10 rounded mt-1">
                  <div
                    className="h-2 bg-[var(--brand-primary)] rounded"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="label">Ordem (opcional)</div>
            <Input
              type="number"
              min={1}
              placeholder="1"
              value={form.ordem}
              onChange={(e) => setForm({ ...form, ordem: e.target.value })}
            />
          </div>

          <div>
            <div className="label">Duração em minutos (opcional)</div>
            <Input
              type="number"
              min={1}
              placeholder="45"
              value={form.duracaoMin}
              onChange={(e) => setForm({ ...form, duracaoMin: e.target.value })}
            />
          </div>

          {err && (
            <div className="md:col-span-2">
              <p className="text-red-600 text-sm">{err}</p>
            </div>
          )}

          <div className="md:col-span-2 flex items-center justify-end">
            <Button disabled={creating}>
              {creating ? 'Enviando…' : 'Salvar vídeo-aula'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        {!cursoId ? (
          <p className="text-[color:var(--text-muted)] mt-3">Selecione um curso para ver as vídeo-aulas.</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Vídeo-aulas do curso</h2>
              <div className="text-sm text-[color:var(--text-muted)]">
                {videosQuery.isFetching ? 'Atualizando…' : `${videos.length} itens`}
              </div>
            </div>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[color:var(--text-muted)]">
                    <th className="py-2">#</th>
                    <th className="py-2">Título</th>
                    <th className="py-2">Arquivo</th>
                    <th className="py-2">Duração</th>
                    <th className="py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {videos
                    .slice()
                    .sort((a, b) => (a.ordem ?? 1e9) - (b.ordem ?? 1e9) || a.createdAt.localeCompare(b.createdAt))
                    .map((v: VideoAula, idx: number) => (
                      <tr key={v.id} className="border-t border-black/5">
                        <td className="py-3">{v.ordem ?? idx + 1}</td>
                        <td className="py-3">{v.titulo}</td>
                        <td className="py-3 truncate max-w-[280px]">
                          <a className="link" href={v.urlVideo} target="_blank" rel="noreferrer">
                            {v.urlVideo.split('/').pop()}
                          </a>
                        </td>
                        <td className="py-3">{v.duracaoMin ? `${v.duracaoMin} min` : '—'}</td>
                        <td className="py-3">
                          <button
                            className="btn btn-ghost text-red-600"
                            title="Excluir"
                            onClick={() => handleDelete(v.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
