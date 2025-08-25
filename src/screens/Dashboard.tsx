import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useAuth } from '../auth/store';
import { GraduationCap, Layers, Users, ClipboardList, FileText, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const clear = useAuth((s) => s.clear);
  const tiles = [
    { to: '/admin/cursos', icon: GraduationCap, title: 'Cursos' },
    { to: '/turmas', icon: Layers, title: 'Turmas' },
    { to: '/alunos', icon: Users, title: 'Alunos' },
    { to: '/matriculas', icon: ClipboardList, title: 'Matrículas' },
    { to: '/exercicios', icon: ListChecks, title: 'Exercícios' },
    { to: '/provas', icon: FileText, title: 'Provas' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Área do Admin</h1>
        <Button variant="ghost" onClick={clear}>Sair</Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ to, icon: Icon, title }) => (
          <Link key={to} to={to}>
            <Card className="p-5 hover:shadow-xl transition">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--brand-primary)] text-white grid place-items-center">
                  <Icon size={18}/>
                </div>
                <div>
                  <h2 className="text-lg font-medium">{title}</h2>
                  <p className="text-sm text-[color:var(--text-muted)]">Gerenciar {title.toLowerCase()}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
