/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listVideoAulas, type VideoAula } from '../../../services/videoaulas';
import { getCursoProgresso, patchProgresso } from '../../../services/progresso';
import { listModulos, type Modulo } from '../../../services/modulos';
import { Card } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { CheckCircle2, PlayCircle, ChevronLeft, ChevronRight, Lock, Calendar as CalendarIcon } from 'lucide-react';

function parseLiberarEm(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const iso = dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isLocked(v: Pick<VideoAula, 'liberarEm'>, now = new Date()): boolean {
  const d = parseLiberarEm(v.liberarEm);
  return d ? d.getTime() > now.getTime() : false;
}

function formatDateBR(value?: string | null) {
  if (!value) return '—';
  const iso = value.length === 10 ? `${value}T00:00:00` : value;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

export default function CursoPlayer() {
  const { cursoId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSentRef = useRef<number>(0);

  // ===== QUERIES =====
  const aulasQ = useQuery<VideoAula[]>({
    queryKey: ['videoaulas', cursoId],
    queryFn: () => listVideoAulas(cursoId),
    enabled: !!cursoId,
  });

  const progQ = useQuery({
    queryKey: ['progresso', { cursoId }],
    queryFn: () => getCursoProgresso(cursoId),
    enabled: !!cursoId,
    staleTime: 15_000,
  });

  // módulos do curso (normalizando {data:[...]} ou [...])
  const modulosQ = useQuery<Modulo[]>({
    queryKey: ['modulos', cursoId],
    queryFn: async () => {
      const raw = await listModulos(cursoId);
      const list = (raw as any)?.data ?? raw;
      return Array.isArray(list) ? (list as Modulo[]) : [];
    },
    enabled: !!cursoId,
    staleTime: 30_000,
  });

  // ===== ORDENAÇÕES / AGRUPAMENTOS =====
  const ordered = useMemo(
    () =>
      (aulasQ.data ?? []).slice().sort(
        (a, b) =>
          (a.ordem ?? 1e9) - (b.ordem ?? 1e9) ||
          (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
      ),
    [aulasQ.data]
  );

  // Ordena módulos por ordem (nulos por último) e nome
  const modulesSorted = useMemo(() => {
    const ms = modulosQ.data ?? [];
    return ms
      .slice()
      .sort(
        (a, b) =>
          (a.ordem ?? 1e9) - (b.ordem ?? 1e9) ||
          a.nome.localeCompare(b.nome)
      );
  }, [modulosQ.data]);

  // Agrupa aulas por módulo + mantém "Sem módulo"
  const grouped = useMemo(() => {
    const by: Record<string, VideoAula[]> = {};
    modulesSorted.forEach((m) => (by[m.id] = []));
    const noModule: VideoAula[] = [];

    ordered.forEach((v) => {
      const moduloId = (v as any).moduloId ?? null;
      if (moduloId && by[moduloId]) {
        by[moduloId].push(v);
      } else {
        noModule.push(v);
      }
    });

    return { by, noModule };
  }, [ordered, modulesSorted]);

  // ===== ESTADO LOCAL =====
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [positions, setPositions] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Troca de curso => reseta estado local
  useEffect(() => {
    setCurrentId(null);
    setDoneMap({});
    setPositions({});
    lastSentRef.current = 0;
  }, [cursoId]);

  // Seleciona aula inicial assim que chegarem aulas/progresso
  useEffect(() => {
    const p = progQ.data;
    // aplica progresso do servidor sem perder o que já marcamos localmente
    if (p) {
      setDoneMap((prev) => {
        const merged = { ...prev };
        (p.doneIds ?? []).forEach((id) => (merged[id] = true));
        return merged;
      });
      setPositions((prev) => ({ ...prev, ...(p.positions ?? {}) }));
    }

    if (!currentId) {
      if (p?.lastVideoAulaId && ordered.some((v) => v.id === p.lastVideoAulaId)) {
        setCurrentId(p.lastVideoAulaId);
      } else if (ordered.length > 0) {
        setCurrentId(ordered[0].id);
      }
    }
  }, [ordered, progQ.data, currentId]);

  const currentIdx = useMemo(
    () => ordered.findIndex((v) => v.id === currentId),
    [ordered, currentId]
  );
  const current = currentIdx >= 0 ? ordered[currentIdx] : null;

  const total = ordered.length;
  const watched = Object.values(doneMap).filter(Boolean).length;
  const pct = total ? Math.round((watched / total) * 100) : 0;

  const currentLocked = current ? isLocked(current) : false;
  const currentReleaseLabel = current?.liberarEm ? formatDateBR(current.liberarEm) : null;

  // ===== MUTATION =====
  const mutation = useMutation({
    mutationFn: (body: { videoAulaId: string; positionSec?: number; completed?: boolean }) =>
      patchProgresso(cursoId, body),
    onSuccess: (_, vars) => {
      setErrorMsg(null);
      if (vars.positionSec != null) {
        setPositions((prev) => ({ ...prev, [vars.videoAulaId]: vars.positionSec! }));
      }
      if (vars.completed !== undefined) {
        setDoneMap((prev) => ({ ...prev, [vars.videoAulaId]: !!vars.completed }));
      }
      qc.invalidateQueries({ queryKey: ['progresso', { cursoId }] });
    },
    onError: (e: any) => {
      setErrorMsg(e?.response?.data?.message ?? 'Falha ao atualizar progresso.');
    },
  });

  // ===== HELPERS =====
  function setCurrentAndTouch(id: string) {
    setCurrentId(id);
    const pos = positions[id] ?? 0;
    // só toca progresso se a aula já está liberada
    const v = ordered.find((x) => x.id === id);
    if (v && !isLocked(v)) {
      mutation.mutate({ videoAulaId: id, positionSec: Math.max(0, Math.floor(pos)) });
    }
  }

  function reportPosition(sec: number) {
    const now = Date.now();
    if (now - lastSentRef.current < 2000) return; // throttle a cada 2s
    lastSentRef.current = now;
    if (!current || currentLocked) return;
    mutation.mutate({ videoAulaId: current.id, positionSec: Math.max(0, Math.floor(sec)) });
  }

  function markCompleted() {
    if (!current || currentLocked) return;
    const v = videoRef.current;
    const pos = Math.floor(v?.currentTime || 0);
    mutation.mutate({ videoAulaId: current.id, completed: true, positionSec: pos || undefined });
  }

  function unmarkCompleted() {
    if (!current || currentLocked) return;
    const v = videoRef.current;
    const pos = Math.floor(v?.currentTime || positions[current.id] || 0);
    mutation.mutate({ videoAulaId: current.id, completed: false, positionSec: pos || undefined });
  }

  function handleEnded() {
    if (!current || currentLocked) return;
    const dur = Math.floor(videoRef.current?.duration || 0);
    mutation.mutate({ videoAulaId: current.id, completed: true, positionSec: dur || undefined });
    if (currentIdx < ordered.length - 1) setCurrentAndTouch(ordered[currentIdx + 1].id);
  }

  function handlePrev() {
    if (currentIdx > 0) setCurrentAndTouch(ordered[currentIdx - 1].id);
  }
  function handleNext() {
    if (currentIdx < ordered.length - 1) setCurrentAndTouch(ordered[currentIdx + 1].id);
  }

  // ===== RENDER =====
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
      <aside className="lg:sticky lg:top-16 self-start">
        <Card className="p-0">
          <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
            <div className="font-semibold">Aulas ({total})</div>
            <div className="text-xs text-[color:var(--text-muted)] mt-0.5">{pct}% concluído</div>
            <div className="h-1 bg-black/10 dark:bg-white/10 rounded mt-2">
              <div className="h-1 bg-[var(--brand-primary)] rounded" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {/* Módulos com aulas */}
            {modulesSorted.map((md) => {
              const items = grouped.by[md.id] ?? [];
              if (items.length === 0) return null;
              return (
                <div key={md.id}>
                  <div className="px-4 py-2 text-xs uppercase tracking-wide text-[color:var(--text-muted)] bg-black/5 dark:bg-white/5">
                    {md.ordem ? `${md.ordem}. ` : ''}{md.nome}
                  </div>
                  <ul>
                    {items.map((v, i) => {
                      const active = v.id === currentId;
                      const watchedItem = !!doneMap[v.id];
                      const locked = isLocked(v);
                      const liberaLabel = v.liberarEm ? formatDateBR(v.liberarEm) : null;
                      return (
                        <li key={v.id}>
                          <button
                            className={[
                              'w-full text-left px-4 py-3 flex items-center gap-3 transition',
                              active ? 'bg-[var(--brand-primary)]/10' : 'hover:bg-black/5 dark:hover:bg-white/5',
                              locked ? 'opacity-60' : '',
                            ].join(' ')}
                            onClick={() => setCurrentAndTouch(v.id)}
                            title={v.titulo}
                          >
                            {locked ? (
                              <Lock size={18} className="opacity-80" />
                            ) : watchedItem ? (
                              <CheckCircle2 size={18} className="text-green-600" />
                            ) : (
                              <PlayCircle size={18} className="opacity-70" />
                            )}
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {v.ordem ?? i + 1}. {v.titulo}
                              </div>
                              <div className="text-xs text-[color:var(--text-muted)] flex items-center gap-2">
                                {v.duracaoMin ? `${v.duracaoMin} min` : '—'}
                                {locked && (
                                  <span className="inline-flex items-center gap-1">
                                    <CalendarIcon size={12} /> Disponível em {liberaLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}

            {/* Grupo "Sem módulo" */}
            {grouped.noModule.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs uppercase tracking-wide text-[color:var(--text-muted)] bg-black/5 dark:bg-white/5">
                  Sem módulo
                </div>
                <ul>
                  {grouped.noModule.map((v, i) => {
                    const active = v.id === currentId;
                    const watchedItem = !!doneMap[v.id];
                    const locked = isLocked(v);
                    const liberaLabel = v.liberarEm ? formatDateBR(v.liberarEm) : null;
                    return (
                      <li key={v.id}>
                        <button
                          className={[
                            'w-full text-left px-4 py-3 flex items-center gap-3 transition',
                            active ? 'bg-[var(--brand-primary)]/10' : 'hover:bg-black/5 dark:hover:bg-white/5',
                            locked ? 'opacity-60' : '',
                          ].join(' ')}
                          onClick={() => setCurrentAndTouch(v.id)}
                          title={v.titulo}
                        >
                          {locked ? (
                            <Lock size={18} className="opacity-80" />
                          ) : watchedItem ? (
                            <CheckCircle2 size={18} className="text-green-600" />
                          ) : (
                            <PlayCircle size={18} className="opacity-70" />
                          )}
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {v.ordem ?? i + 1}. {v.titulo}
                            </div>
                            <div className="text-xs text-[color:var(--text-muted)] flex items-center gap-2">
                              {v.duracaoMin ? `${v.duracaoMin} min` : '—'}
                              {locked && (
                                <span className="inline-flex items-center gap-1">
                                  <CalendarIcon size={12} /> Disponível em {liberaLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Nenhuma aula */}
            {ordered.length === 0 && (
              <div className="px-4 py-3 text-sm text-[color:var(--text-muted)]">
                Nenhuma aula disponível.
              </div>
            )}
          </div>
        </Card>
      </aside>

      <section className="space-y-3">
        <Card className="p-3">
          {!current ? (
            <div className="p-6 text-[color:var(--text-muted)]">Selecione uma aula na lista ao lado.</div>
          ) : currentLocked ? (
            <div className="p-6">
              <div className="flex items-start gap-3">
                <Lock size={20} className="mt-0.5" />
                <div>
                  <div className="font-medium">Esta aula ainda não foi liberada.</div>
                  <div className="text-sm text-[color:var(--text-muted)]">
                    Disponível em <b>{currentReleaseLabel}</b>. Você pode explorar outras aulas já liberadas.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="aspect-video bg-black/80 rounded-lg overflow-hidden">
                <video
                  key={current.id}
                  ref={videoRef}
                  src={current.urlVideo}
                  controls
                  autoPlay
                  onEnded={handleEnded}
                  onTimeUpdate={(e) => reportPosition((e.target as HTMLVideoElement).currentTime)}
                  onPause={() => {
                    const v = videoRef.current;
                    if (v) {
                      mutation.mutate({
                        videoAulaId: current.id,
                        positionSec: Math.max(0, Math.floor(v.currentTime || 0)),
                      });
                    }
                  }}
                  onSeeked={() => {
                    const v = videoRef.current;
                    if (v) {
                      mutation.mutate({
                        videoAulaId: current.id,
                        positionSec: Math.max(0, Math.floor(v.currentTime || 0)),
                      });
                    }
                  }}
                  onLoadedMetadata={() => {
                    const pos = positions[current.id] ?? 0;
                    const v = videoRef.current;
                    if (v && pos > 0) {
                      try {
                        v.currentTime = pos;
                      } catch {}
                    }
                    mutation.mutate({
                      videoAulaId: current.id,
                      positionSec: Math.max(0, Math.floor(pos)),
                    });
                  }}
                  className="w-full h-full"
                />
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="font-semibold">
                  {current.ordem ?? currentIdx + 1}. {current.titulo}
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handlePrev} disabled={currentIdx <= 0} className="btn btn-ghost">
                    <ChevronLeft size={16} /> Anterior
                  </Button>
                  <Button onClick={handleNext} disabled={currentIdx >= ordered.length - 1}>
                    Próxima <ChevronRight size={16} />
                  </Button>
                </div>
              </div>

              <div className="mt-2">
                {!doneMap[current.id] ? (
                  <Button onClick={markCompleted} disabled={mutation.isPending}>
                    Marcar como concluída
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle2 size={16} /> Aula concluída
                    </span>
                    <button
                      className="btn btn-ghost text-sm"
                      onClick={unmarkCompleted}
                      disabled={mutation.isPending}
                    >
                      Desmarcar
                    </button>
                  </div>
                )}
              </div>

              {errorMsg && <p className="text-red-600 text-sm mt-2">{errorMsg}</p>}
            </>
          )}
        </Card>

        {current && !currentLocked && (
          <Card className="p-4">
            <div className="text-sm text-[color:var(--text-muted)] whitespace-pre-wrap">
              {current.descricao || 'Sem descrição para esta aula.'}
            </div>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <button className="btn btn-ghost" onClick={() => navigate('/aluno/cursos')}>
            Voltar
          </button>
          {current && (
            <div className="text-xs text-[color:var(--text-muted)]">
              {currentIdx + 1} / {ordered.length}
            </div>
          )}
        </div>

        {(aulasQ.error || progQ.error) && (
          <div className="text-red-600 text-sm">
            {String(aulasQ.error || progQ.error)}
          </div>
        )}
      </section>
    </div>
  );
}
