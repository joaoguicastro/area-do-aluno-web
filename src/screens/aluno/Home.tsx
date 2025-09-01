/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/store';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';

import { listMatriculasAtivasDoAluno, type Matricula } from '../../services/matriculas';
import { listVideoAulas, type VideoAula } from '../../services/videoaulas';
import { getCursoById } from '../../services/cursos';
import { getCursoProgresso, type CursoProgresso } from '../../services/progresso';
import { listInformativosAluno, type Informativo } from '../../services/informativos';

function truncate(text: string | undefined, max = 120) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}
function fmtDate(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

type ProgressoResumo = { cursoId: string; progress: CursoProgresso | null };

function CursoCard({
  cursoId,
  status,
  progresso,
  onEnter,
}: {
  cursoId: string;
  status: Matricula['status'];
  progresso: CursoProgresso | null | undefined;
  onEnter?: (id: string) => void;
}) {
  const navigate = useNavigate();

  const cursoQ = useQuery({
    queryKey: ['curso', cursoId],
    queryFn: () => getCursoById(cursoId),
    enabled: !!cursoId,
    staleTime: 1000 * 60 * 5,
  });

  // AGORA: tipa como VideoAula[] e não usa `.data`
  const videosQ = useQuery<VideoAula[]>({
    queryKey: ['videoaulas', { cursoId }],
    queryFn: () => listVideoAulas(cursoId),
    enabled: !!cursoId,
    staleTime: 1000 * 30,
  });

  const nome = cursoQ.data?.nome ?? 'Curso';
  const desc = videosQ.data?.[0]?.descricao ?? '';
  const total = progresso?.total ?? (videosQ.data?.length ?? 0);
  const feitos = progresso?.feitos ?? 0;
  const pct = total ? Math.round((feitos / total) * 100) : 0;
  const hasLast = !!progresso?.lastVideoAulaId;

  const go = () => {
    onEnter?.(cursoId);
    navigate(`/aluno/cursos/${cursoId}`);
  };

  return (
    <Card className="p-0">
      <div
        role="button"
        tabIndex={0}
        onClick={go}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' ? go() : undefined)}
        className="p-4 cursor-pointer hover:bg-black/5 dark:hover:bg:white/5 transition rounded-lg"
        title="Acessar curso"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{nome}</div>
            <div className="text-xs text-[color:var(--text-muted)] mt-0.5 truncate">
              {truncate(desc, 100) || 'Sem descrição.'}
            </div>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-black/5 dark:bg-white/10">{status}</span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-[color:var(--text-muted)] truncate">
            {hasLast ? 'Retomar sua última aula' : 'Começar agora'}
          </div>
          <Button className="px-3 py-1 text-sm" onClick={(e) => { e.stopPropagation(); go(); }}>
            {hasLast ? 'Continuar' : 'Acessar'}
          </Button>
        </div>

        <div className="mt-3">
          <div className="h-2 bg-black/10 dark:bg-white/10 rounded">
            <div className="h-2 bg-[var(--brand-primary)] rounded" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-xs text-[color:var(--text-muted)]">
            {feitos}/{total} aulas • {pct}%
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Home() {
  const profile = useAuth((s) => s.profile);
  const alunoId = useAuth((s) => s.profile?.alunoId ?? null);
  const navigate = useNavigate();

  // Matrículas
  const { data: matr, isFetching, error } = useQuery<Matricula[]>({
    queryKey: ['meus-cursos', alunoId],
    queryFn: () => listMatriculasAtivasDoAluno(alunoId as string),
    enabled: !!alunoId,
    staleTime: 1000 * 30,
  });

  const cursoIds: string[] = useMemo(() => (matr ?? []).map((m) => m.cursoId), [matr]);

  // Progresso (todos os cursos do aluno)
  const progResumoQ = useQuery<ProgressoResumo[]>({
    queryKey: ['progresso-resumo', ...cursoIds],
    enabled: !!alunoId && cursoIds.length > 0,
    staleTime: 1000 * 15,
    queryFn: async () => {
      const results = await Promise.all(
        cursoIds.map(async (id) => {
          try {
            const progress = await getCursoProgresso(id);
            return { cursoId: id, progress } as ProgressoResumo;
          } catch {
            return { cursoId: id, progress: null };
          }
        })
      );
      return results;
    },
  });

  // Informativos do aluno
  const infosQ = useQuery<{ data: Informativo[] }>({
    queryKey: ['informativos-aluno'],
    queryFn: () => listInformativosAluno({ perPage: 5 }),
    enabled: !!alunoId,
    staleTime: 1000 * 60,
  });
  const informativos = infosQ.data?.data ?? [];

  // "Continuar"
  const continuarId: string | null = useMemo(() => {
    if (!progResumoQ.data || progResumoQ.data.length === 0) return cursoIds[0] ?? null;
    let bestId: string | null = null;
    let bestTs = -1;
    for (const item of progResumoQ.data) {
      const ts = item.progress?.updatedAt ? Date.parse(item.progress.updatedAt) : 0;
      if (ts > bestTs) {
        bestTs = ts;
        bestId = item.cursoId;
      }
    }
    return bestId ?? (cursoIds[0] ?? null);
  }, [progResumoQ.data, cursoIds]);

  const contCursoQ = useQuery({
    queryKey: ['curso', continuarId],
    queryFn: () => getCursoById(continuarId as string),
    enabled: !!continuarId,
    staleTime: 1000 * 60 * 5,
  });

  // AGORA: tipa como VideoAula[] e usa direto o array
  const contVideosQ = useQuery<VideoAula[]>({
    queryKey: ['videoaulas', { cursoId: continuarId, preview: true }],
    queryFn: () => listVideoAulas(continuarId as string),
    enabled: !!continuarId,
    staleTime: 1000 * 30,
  });

  const contNome = contCursoQ.data?.nome;
  const contDesc = contVideosQ.data?.[0]?.descricao ?? '';

  useEffect(() => {
    if (continuarId) {
      // prefetch opcional
    }
  }, [continuarId]);

  if (!alunoId) {
    return (
      <Card>
        <p className="text-sm">
          Seu perfil não possui <code>alunoId</code>. Peça ao administrador para vincular o usuário ao cadastro do aluno.
        </p>
      </Card>
    );
  }

  if (error) return <p className="text-red-600">Erro ao carregar seus cursos.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Olá{profile?.nome ? `, ${profile.nome}` : ''}! 👋
        </h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/aluno/cursos')}>Meus Cursos</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm text-[color:var(--text-muted)]">Continuar</div>
              <div className="text-lg font-semibold mt-1 truncate">
                {continuarId ? (contNome ?? 'Carregando…') : 'Escolha um curso para começar'}
              </div>
              {continuarId && (
                <p className="text-sm text-[color:var(--text-muted)] mt-1">
                  {truncate(contDesc, 160) || 'Sem descrição.'}
                </p>
              )}
            </div>
            <div className="shrink-0">
              <Button
                onClick={() =>
                  continuarId ? navigate(`/aluno/cursos/${continuarId}`) : navigate('/aluno/cursos')
                }
              >
                {continuarId ? 'Ir para o curso' : 'Ver meus cursos'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="font-semibold">Informativos</div>
          <div className="mt-2 space-y-2">
            {infosQ.isFetching && informativos.length === 0 && (
              <p className="text-sm text-[color:var(--text-muted)]">Carregando…</p>
            )}

            {informativos.length === 0 && !infosQ.isFetching && (
              <p className="text-sm text-[color:var(--text-muted)]">Sem informativos no momento.</p>
            )}

            {informativos.slice(0, 3).map((i) => (
              <div key={i.id} className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 transition">
                <div className="text-sm font-medium truncate">{i.titulo}</div>
                <div className="text-xs text-[color:var(--text-muted)]">{fmtDate(i.createdAt)}</div>
                <p className="text-sm text-[color:var(--text-muted)] mt-1">
                  {truncate((i as any).mensagem ?? (i as any).message ?? '', 140)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Seus cursos</div>
          <button className="btn btn-ghost text-sm" onClick={() => navigate('/aluno/cursos')}>
            Ver todos
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(matr ?? []).map((m) => {
            const resumo = progResumoQ.data?.find((r) => r.cursoId === m.cursoId)?.progress;
            return (
              <CursoCard
                key={m.id}
                cursoId={m.cursoId}
                status={m.status}
                progresso={resumo}
              />
            );
          })}

          {!isFetching && (matr?.length ?? 0) === 0 && (
            <Card className="p-4">
              <p className="text-sm text-[color:var(--text-muted)]">Você ainda não possui matrículas ativas.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
