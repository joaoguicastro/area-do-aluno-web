/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NavLink, Outlet } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import {
  GraduationCap,
  Layers,
  Users,
  ClipboardList,
  ListChecks,
  FileText,
  LayoutDashboard,
  LogOut,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react';
import ThemeToggle from '../theme/ThemeToggle';
import { useAuth } from '../auth/store';

type LinkItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

export default function AdminShell() {
  const clear = useAuth((s) => s.clear);
  const role = useAuth((s) => s.role); // MASTER | ADMIN | ...

  const links: LinkItem[] = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/cursos', label: 'Cursos', icon: GraduationCap },
    { to: '/admin/turmas', label: 'Turmas', icon: Layers },
    { to: '/admin/alunos', label: 'Alunos', icon: Users },
    { to: '/admin/matriculas', label: 'Matrículas', icon: ClipboardList },
    { to: '/admin/exercicios', label: 'Exercícios', icon: ListChecks },
    { to: '/admin/provas', label: 'Provas', icon: FileText },
    { to: '/admin/videoaulas', label: 'Vídeo-aulas', icon: PlayCircle },
    ...(role === 'MASTER'
      ? [{ to: '/admin/funcionarios', label: 'Funcionários', icon: Users } as LinkItem]
      : []),
    { to: '/admin/informativos', label: 'Informativos', icon: Megaphone },
    { to: '/admin/modulos', label: 'Módulos', icon: Layers }
  ];

  return (
    <div className="min-h-screen grid md:grid-cols-[260px_1fr]">
      <aside className="hidden md:block border-r border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/30 backdrop-blur">
        <div className="px-5 py-4 flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-[var(--brand-primary)]" />
          <div>
            <div className="font-semibold leading-none">Área do Aluno</div>
            <div className="text-xs text-[color:var(--text-muted)]">Admin</div>
          </div>
        </div>
        <nav className="px-2 py-2">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition',
                  isActive
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'hover:bg-black/5 dark:hover:bg-white/5',
                ].join(' ')
              }
            >
              <l.icon size={18} />
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-h-screen">
        <header className="sticky top-0 z-10 bg-[var(--surface-bg)]/80 backdrop-blur border-b border-black/10 dark:border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="md:hidden font-semibold">Admin</div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button className="btn btn-ghost" onClick={clear}>
                <LogOut size={18} /> <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
