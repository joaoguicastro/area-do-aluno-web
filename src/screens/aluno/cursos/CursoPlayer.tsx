/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listVideoAulas, type VideoAula } from '../../../services/videoaulas';
import { getCursoProgresso, patchProgresso } from '../../../services/progresso';
import { Card } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { CheckCircle2, PlayCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CursoPlayer() {
  const { cursoId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSentRef = useRef<number>(0);

  // ===== QUERIES =====
  const aulasQ = useQuery({
    queryKey: ['videoaulas', { cursoId }],
    queryFn: () => listVideoAulas(cursoId),
    enabled: !!cursoId,
    staleTime: 1000 * 30,
  });

  const progQ = useQuery({
    queryKey: ['progresso', { cursoId }],
    queryFn: () => getCursoProgresso(cursoId),
    enabled: !!cursoId,
    staleTime: 1000 * 15,
  });

  // Ordenação estável: ordem (nulls por último), depois createdAt
  const ordered: VideoAula[] = useMemo(() => {
    const list = aulasQ.data?.data ?? [];
    return list
      .slice()
      .sort((a, b) => (a.ordem ?? 1e9) - (b.ordem ?? 1e9) || a.createdAt.localeCompare(b.createdAt));
  }, [aulasQ.data]);

  // ===== ESTADO LOCAL =====
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [positions, setPositions] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Seleciona a primeira aula assim que chegarem as aulas (fallback)
  useEffect(() => {
    if (!currentId && ordered.length > 0) {
      setCurrentId(ordered[0].id);
    }
  }, [ordered, currentId]);

  // Aplica progresso do servidor SEM perder o que já marcamos localmente.
  useEffect(() => {
    const p = progQ.data;
    if (!p) return;

    setDoneMap((prev) => {
      const merged = { ...prev };
      (p.doneIds ?? []).forEach((id) => (merged[id] = true));
      return merged;
    });

    setPositions((prev) => ({ ...prev, ...(p.positions ?? {}) }));

    // Se o servidor conhece a última aula visitada e ainda não temos atual selecionada
    if (p.lastVideoAulaId && !currentId) {
      setCurrentId(p.lastVideoAulaId);
    }
  }, [progQ.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentIdx = useMemo(() => ordered.findIndex((v) => v.id === currentId), [ordered, currentId]);
  const current = currentIdx >= 0 ? ordered[currentIdx] : null;

  const total = ordered.length;
  const watched = Object.values(doneMap).filter(Boolean).length;
  const pct = total ? Math.round((watched / total) * 100) : 0;

  // ===== MUTATION =====
  const mutation = useMutation({
    mutationFn: (body: { videoAulaId: string; positionSec?: number; completed?: boolean }) =>
      patchProgresso(cursoId, body),
    onSuccess: (_, vars) => {
      setErrorMsg(null);
      if (vars.positionSec != null) {
        setPositions((prev) => ({ ...prev, [vars.videoAulaId]: vars.positionSec! }));
      }
      // Atualiza doneMap tanto para true quanto para false
      if (vars.completed !== undefined) {
        setDoneMap((prev) => ({ ...prev, [vars.videoAulaId]: !!vars.completed }));
      }
      // refetch para refletir em outras telas; nossa UI local já atualizou
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
    mutation.mutate({ videoAulaId: id, positionSec: Math.max(0, Math.floor(pos)) });
  }

  function reportPosition(sec: number) {
    const now = Date.now();
    if (now - lastSentRef.current < 2000) return; // throttle a cada 2s
    lastSentRef.current = now;
    if (!current) return;
    mutation.mutate({ videoAulaId: current.id, positionSec: Math.max(0, Math.floor(sec)) });
  }

  async function markCompleted() {
    if (!current) return;
    const v = videoRef.current;
    const pos = Math.floor(v?.currentTime || 0);
    mutation.mutate({ videoAulaId: current.id, completed: true, positionSec: pos || undefined });
  }

  async function unmarkCompleted() {
    if (!current) return;
    const v = videoRef.current;
    const pos = Math.floor(v?.currentTime || positions[current.id] || 0);
    mutation.mutate({ videoAulaId: current.id, completed: false, positionSec: pos || undefined });
  }

  function handleEnded() {
    if (!current) return;
    const dur = Math.floor(videoRef.current?.duration || 0);
    mutation.mutate({ videoAulaId: current.id, completed: true, positionSec: dur || undefined });
    // Avança automaticamente
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
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      <aside className="lg:sticky lg:top-16 self-start">
        <Card className="p-0">
          <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
            <div className="font-semibold">Aulas ({total})</div>
            <div className="text-xs text-[color:var(--text-muted)] mt-0.5">{pct}% concluído</div>
            <div className="h-1 bg-black/10 dark:bg-white/10 rounded mt-2">
              <div className="h-1 bg-[var(--brand-primary)] rounded" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <ul className="max-h-[70vh] overflow-y-auto">
            {ordered.map((v, i) => {
              const active = v.id === currentId;
              const watched = !!doneMap[v.id];
              return (
                <li key={v.id}>
                  <button
                    className={[
                      'w-full text-left px-4 py-3 flex items-center gap-3 transition',
                      active ? 'bg-[var(--brand-primary)]/10' : 'hover:bg-black/5 dark:hover:bg-white/5',
                    ].join(' ')}
                    onClick={() => setCurrentAndTouch(v.id)}
                    title={v.titulo}
                  >
                    {watched ? (
                      <CheckCircle2 size={18} className="text-green-600" />
                    ) : (
                      <PlayCircle size={18} className="opacity-70" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {v.ordem ?? i + 1}. {v.titulo}
                      </div>
                      <div className="text-xs text-[color:var(--text-muted)]">
                        {v.duracaoMin ? `${v.duracaoMin} min` : '—'}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
            {!ordered.length && (
              <li className="px-4 py-3 text-sm text-[color:var(--text-muted)]">Nenhuma aula disponível.</li>
            )}
          </ul>
        </Card>
      </aside>

      <section className="space-y-3">
        <Card className="p-3">
          {!current ? (
            <div className="p-6 text-[color:var(--text-muted)]">Selecione uma aula na lista ao lado.</div>
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
                    if (v && current) {
                      mutation.mutate({
                        videoAulaId: current.id,
                        positionSec: Math.max(0, Math.floor(v.currentTime || 0)),
                      });
                    }
                  }}
                  onSeeked={() => {
                    const v = videoRef.current;
                    if (v && current) {
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
                    mutation.mutate({ videoAulaId: current.id, positionSec: Math.max(0, Math.floor(pos)) });
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

        {current && (
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
