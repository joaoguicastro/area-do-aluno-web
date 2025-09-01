/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { listCursos, type Curso } from '../../../services/cursos';
import {
  addVideoAula,
  listVideoAulas,
  deleteVideoAula,
  type VideoAula,
} from '../../../services/videoaulas';
import { uploadVideo } from '../../../services/uploads';
import { listModulos, type Modulo } from '../../../services/modulos';

import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { Textarea } from '../../../ui/Textarea';
import { Trash2, CalendarDays } from 'lucide-react';
import { api } from '../../../lib/api';

function formatDateBR(value?: string | null) {
  if (!value) return '—';
  const iso = value.length === 10 ? `${value}T00:00:00` : value;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

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
    moduloId: string;
    liberarEm: string; // YYYY-MM-DD (opcional)
  }>({
    titulo: '',
    descricao: '',
    ordem: '',
    duracaoMin: '',
    file: null,
    moduloId: '',
    liberarEm: '',
  });

  // cursos p/ select (sem page/perPage)
  const cursosQuery = useQuery({
    queryKey: ['cursos-for-select'],
    queryFn: async () => {
      const res: any = await listCursos(); // sem params (evita 400)
      return res;
    },
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  // >>> garante sempre um array aqui
  const cursos = useMemo(() => {
    const r: any = cursosQuery.data;
    if (Array.isArray(r)) return r as Curso[];
    if (Array.isArray(r?.data)) return r.data as Curso[];
    return [] as Curso[];
  }, [cursosQuery.data]);

  // módulos do curso
  const modulosQuery = useQuery({
    queryKey: ['modulos', cursoId],
    queryFn: async () => {
      if (!cursoId) return [] as Modulo[];
      const raw = await listModulos(cursoId);
      return Array.isArray(raw) ? (raw as Modulo[]) : (((raw as any)?.data ?? []) as Modulo[]);
    },
    enabled: !!cursoId,
    staleTime: 1000 * 30,
    retry: false,
  });
  const modulos = useMemo(() => (modulosQuery.data ?? []) as Modulo[], [modulosQuery.data]);

  // vídeo-aulas do curso (AGORA já vem como array)
  const videosQuery = useQuery<VideoAula[]>({
    queryKey: ['videoaulas', cursoId],
    queryFn: () => listVideoAulas(cursoId),
    enabled: !!cursoId,
    staleTime: 1000 * 30,
    retry: false,
  });
  const videos = useMemo(() => (videosQuery.data ?? []) as VideoAula[], [videosQuery.data]);

  // agrupamento por módulo (inclui "Sem módulo")
  const grupos = useMemo(() => {
    type Grupo = { key: string; titulo: string; ordem: number | null; itens: VideoAula[] };
    const by: Record<string, Grupo> = {};

    for (const md of modulos) {
      by[md.id] = {
        key: md.id,
        titulo: `${md.ordem ? md.ordem + '. ' : ''}${md.nome}`,
        ordem: md.ordem ?? null,
        itens: [],
      };
    }
    by['__SEM__'] = { key: '__SEM__', titulo: 'Sem módulo', ordem: 9_999_999, itens: [] };

    for (const v of videos) {
      const key = (v as any).moduloId || '__SEM__';
      (by[key] ?? by['__SEM__']).itens.push(v);
    }

    for (const g of Object.values(by)) {
      g.itens.sort(
        (a, b) =>
          (a.ordem ?? 1e9) - (b.ordem ?? 1e9) ||
          (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
      );
    }

    return Object.values(by)
      .filter((g) => g.itens.length > 0)
      .sort((a, b) => (a.ordem ?? 1e9) - (b.ordem ?? 1e9) || a.titulo.localeCompare(b.titulo));
  }, [videos, modulos]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!cursoId) return setErr('Selecione um curso.');
    if (!form.titulo.trim()) return setErr('Informe o título.');
    if (!form.file) return setErr('Selecione um arquivo de vídeo.');

    setCreating(true);
    setErr(null);
    setProgress(0);

    try {
      const { url } = await uploadVideo(form.file, (p) => setProgress(p));
      const base = (api as any)?.defaults?.baseURL || window.location.origin;
      const absoluteUrl = url.startsWith('http') ? url : new URL(url, base).toString();

      const payload: any = { titulo: form.titulo.trim(), urlVideo: absoluteUrl };
      if (form.descricao.trim()) payload.descricao = form.descricao.trim();
      if (form.ordem) payload.ordem = Number(form.ordem);
      if (form.duracaoMin) payload.duracaoMin = Number(form.duracaoMin);
      if (form.moduloId) payload.moduloId = form.moduloId;
      if (form.liberarEm) payload.liberarEm = form.liberarEm; // YYYY-MM-DD

      await addVideoAula(cursoId, payload);

      setForm({
        titulo: '',
        descricao: '',
        ordem: '',
        duracaoMin: '',
        file: null,
        moduloId: '',
        liberarEm: '',
      });
      setProgress(0);

      await qc.invalidateQueries({ queryKey: ['videoaulas', cursoId] });
    } catch (e: any) {
      const issues = e?.response?.data?.issues;
      const zodMsg = Array.isArray(issues)
        ? issues.map((i: any) => `${i.path?.join('.')}: ${i.message}`).join(' | ')
        : (issues && typeof issues === 'object')
          ? JSON.stringify(issues)
          : null;
      console.error(e?.response?.data ?? e);
      setErr(zodMsg ?? e?.response?.data?.message ?? e?.message ?? 'Erro ao enviar/criar vídeo-aula');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(videoId: string) {
    if (!cursoId) return;
    if (!confirm('Excluir esta vídeo-aula?')) return;
    try {
      await deleteVideoAula(cursoId, videoId);
      await qc.invalidateQueries({ queryKey: ['videoaulas', cursoId] });
    } catch (e: any) {
      console.error(e?.response?.data ?? e);
      setErr(e?.response?.data?.message ?? e?.message ?? 'Erro ao excluir vídeo-aula');
    }
  }

  const today = new Date();

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
            {cursos.map((c) => (
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
              disabled={!cursoId}
            />
          </div>

          <div className="md:col-span-2">
            <div className="label">Descrição (opcional)</div>
            <Textarea
              rows={3}
              placeholder="Breve descrição"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              disabled={!cursoId}
            />
          </div>

          <div>
            <div className="label">Módulo (opcional)</div>
            <select
              className="input"
              value={form.moduloId}
              onChange={(e) => setForm({ ...form, moduloId: e.target.value })}
              disabled={!cursoId || modulosQuery.isFetching}
            >
              <option value="">Sem módulo</option>
              {modulos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.ordem ? `${m.ordem}. ` : ''}{m.nome}
                </option>
              ))}
            </select>
            {cursoId && modulosQuery.isFetching && (
              <p className="text-xs text-[color:var(--text-muted)] mt-1">Carregando módulos…</p>
            )}
            {modulosQuery.error && <p className="text-xs text-red-600 mt-1">Erro ao carregar módulos.</p>}
          </div>

          <div>
            <div className="label">Arquivo de vídeo *</div>
            <input
              type="file"
              accept="video/*"
              className="input"
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
              required
              disabled={!cursoId}
            />
            {progress > 0 && (
              <div className="mt-2 text-xs text-[color:var(--text-muted)]">
                Enviando: {progress}%
                <div className="h-2 bg-black/10 dark:bg-white/10 rounded mt-1">
                  <div className="h-2 bg-[var(--brand-primary)] rounded" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="label">Ordem (opcional)</div>
            <Input
              type="number"
              min={1}
              step={1}
              placeholder="1"
              value={form.ordem}
              onChange={(e) => setForm({ ...form, ordem: e.target.value })}
              disabled={!cursoId}
            />
          </div>

          <div>
            <div className="label">Duração em minutos (opcional)</div>
            <Input
              type="number"
              min={1}
              step={1}
              placeholder="45"
              value={form.duracaoMin}
              onChange={(e) => setForm({ ...form, duracaoMin: e.target.value })}
              disabled={!cursoId}
            />
          </div>

          {/* NOVO: liberar em */}
          <div>
            <div className="label">Liberar em (opcional)</div>
            <Input
              type="date"
              value={form.liberarEm}
              onChange={(e) => setForm({ ...form, liberarEm: e.target.value })}
              disabled={!cursoId}
            />
            <p className="text-[11px] text-[color:var(--text-muted)] mt-1 flex items-center gap-1">
              <CalendarDays size={12} /> Se vazio, libera imediatamente.
            </p>
          </div>

          {err && <div className="md:col-span-2"><p className="text-red-600 text-sm">{err}</p></div>}

          <div className="md:col-span-2 flex items-center justify-end">
            <Button disabled={creating || !cursoId}>{creating ? 'Enviando…' : 'Salvar vídeo-aula'}</Button>
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

            {videosQuery.error && (
              <p className="text-red-600 text-sm mt-2">
                Erro ao carregar vídeo-aulas. Veja o console/network para detalhes.
              </p>
            )}

            {grupos.length === 0 && !videosQuery.isFetching && !videosQuery.error && (
              <p className="text-[color:var(--text-muted)] mt-4">Nenhuma vídeo-aula.</p>
            )}

            <div className="mt-3 space-y-6">
              {grupos.map((g) => (
                <div key={g.key} className="rounded-lg border p-3">
                  <div className="font-medium mb-2">
                    {g.titulo} <span className="text-xs text-[color:var(--text-muted)]">({g.itens.length})</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[color:var(--text-muted)]">
                          <th className="py-2 w-14">#</th>
                          <th className="py-2">Título</th>
                          <th className="py-2">Arquivo</th>
                          <th className="py-2">Duração</th>
                          <th className="py-2">Libera em</th> {/* NOVO */}
                          <th className="py-2 w-16" />
                        </tr>
                      </thead>
                      <tbody>
                        {g.itens.map((v, idx) => {
                          const libera = (v as any).liberarEm as string | undefined;
                          const isAgendada =
                            !!libera && new Date(libera.length === 10 ? `${libera}T00:00:00` : libera) > today;
                          return (
                            <tr key={v.id} className="border-t border-black/5">
                              <td className="py-3">{v.ordem ?? idx + 1}</td>
                              <td className="py-3">{v.titulo}</td>
                              <td className="py-3 truncate max-w-[280px]">
                                <a className="link" href={v.urlVideo} target="_blank" rel="noreferrer">
                                  {(() => {
                                    try { return new URL(v.urlVideo).pathname.split('/').pop(); }
                                    catch { return v.urlVideo.split('/').pop(); }
                                  })()}
                                </a>
                              </td>
                              <td className="py-3">{v.duracaoMin ? `${v.duracaoMin} min` : '—'}</td>
                              <td className="py-3">
                                {libera ? (
                                  <span className={isAgendada ? 'text-amber-600' : ''}>
                                    {formatDateBR(libera)} {isAgendada ? '• agendada' : ''}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
