/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/store';
import { listMatriculasAtivasDoAluno } from '../../services/matriculas';
import { listVideoAulas } from '../../services/videoaulas';
import { getCursoById } from '../../services/cursos';
import { getCursoProgresso } from '../../services/progresso';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';

function truncate(text: string | undefined, max = 110) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function CursoCard({ m }: { m: any }) {
  const navigate = useNavigate();
  const courseId: string | undefined = m.cursoId ?? m.curso?.id;

  const cursoQ = useQuery({
    queryKey: ['curso', courseId],
    queryFn: () => getCursoById(courseId as string),
    enabled: !!courseId,
    staleTime: 1000 * 60 * 5,
  });

  const videosQ = useQuery({
    queryKey: ['videoaulas', { cursoId: courseId, preview: true }],
    queryFn: () => listVideoAulas(courseId as string),
    enabled: !!courseId,
    staleTime: 1000 * 30,
  });

  const progQ = useQuery({
    queryKey: ['progresso', { cursoId: courseId }],
    queryFn: () => getCursoProgresso(courseId as string),
    enabled: !!courseId,
    staleTime: 1000 * 15,
  });

  const nome = cursoQ.data?.nome ?? m.curso?.nome ?? 'Curso';
  const desc = videosQ.data?.data?.[0]?.descricao ?? '';
  const total = progQ.data?.total ?? videosQ.data?.data?.length ?? 0;
  const feitos = progQ.data?.feitos ?? 0;
  const pct = total ? Math.round((feitos / total) * 100) : 0;
  const hasLast = !!progQ.data?.lastVideoAulaId;

  const goToCourse = () => {
    if (courseId) navigate(`/aluno/cursos/${courseId}`);
  };

  return (
    <Card className="p-0">
      <div
        role="button"
        tabIndex={0}
        onClick={goToCourse}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') goToCourse();
        }}
        className="p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition rounded-lg"
        title="Acessar curso"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium truncate">{nome}</div>
            <div className="text-xs text-[color:var(--text-muted)] mt-0.5 truncate">
              {truncate(desc, 100) || 'Sem descrição.'}
            </div>
          </div>
          <span className="text-xs px-2 py-1 rounded bg-black/5 dark:bg-white/10">
            {m.status}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-[color:var(--text-muted)] truncate">
            {hasLast ? 'Retomar sua última aula' : 'Começar agora'}
          </div>
          <Button
            className="px-3 py-1 text-sm"
            onClick={(e) => {
              e.stopPropagation();
              if (courseId) navigate(`/aluno/cursos/${courseId}`);
            }}
          >
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

export default function MeusCursos() {
  const alunoId = useAuth((s) => s.profile?.alunoId ?? null);

  const { data, isFetching, error } = useQuery({
    queryKey: ['meus-cursos', alunoId],
    queryFn: () => listMatriculasAtivasDoAluno(alunoId as string),
    enabled: !!alunoId,
  });

  if (!alunoId) {
    return (
      <Card>
        <p className="text-sm">
          Seu perfil não possui <code>alunoId</code>. Peça ao administrador para vincular o usuário ao cadastro do aluno,
          ou inclua <code>alunoId</code> no JWT/endpoint <code>/auth/me</code>.
        </p>
      </Card>
    );
  }

  if (error) return <p className="text-red-600">Erro ao carregar seus cursos.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Meus Cursos</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((m: any) => (
          <CursoCard key={m.id} m={m} />
        ))}
      </div>

      {isFetching && <p className="text-sm text-[color:var(--text-muted)]">Atualizando…</p>}
      {!isFetching && (data?.length ?? 0) === 0 && (
        <p className="text-sm text-[color:var(--text-muted)]">Sem matrículas ativas.</p>
      )}
    </div>
  );
}
