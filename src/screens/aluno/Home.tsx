import { useAuth } from '../../auth/store';
import { Card } from '../../ui/Card';

export default function AlunoHome() {
  const profile = useAuth(s => s.profile);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Olá{profile?.nome ? `, ${profile.nome}` : ''}! 👋</h1>
      <Card>
        <p className="text-[color:var(--text-muted)]">
          Bem-vindo à sua área. Acesse <strong>Meus Cursos</strong>, veja seus <strong>Exercícios</strong> e <strong>Provas</strong>.
        </p>
      </Card>
    </div>
  );
}
