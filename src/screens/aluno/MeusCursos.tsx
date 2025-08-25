import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/store';
import { listMatriculasAtivasDoAluno } from '../../services/matriculas';
import { Card } from '../../ui/Card';

export default function MeusCursos() {
  const alunoId = useAuth(s => s.profile?.alunoId ?? null);

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
        {(data ?? []).map((m) => (
          <Card key={m.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{m.curso?.nome ?? 'Curso'}</div>
                <div className="text-xs text-[color:var(--text-muted)]">{m.curso?.modality}</div>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-black/5 dark:bg-white/10">{m.status}</span>
            </div>
          </Card>
        ))}
      </div>
      {isFetching && <p className="text-sm text-[color:var(--text-muted)]">Atualizando…</p>}
      {(!isFetching && (data?.length ?? 0) === 0) && <p className="text-sm text-[color:var(--text-muted)]">Sem matrículas ativas.</p>}
    </div>
  );
}
