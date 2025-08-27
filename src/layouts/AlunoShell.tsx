/* eslint-disable @typescript-eslint/no-explicit-any */
import { NavLink, Outlet } from 'react-router-dom';
import { Home, GraduationCap, LogOut } from 'lucide-react';
import ThemeToggle from '../theme/ThemeToggle';
import { useAuth } from '../auth/store';

const links = [
  { to: '/aluno', label: 'Início', icon: Home, end: true },
  { to: '/aluno/cursos', label: 'Meus Cursos', icon: GraduationCap },
  // { to: '/aluno/exercicios', label: 'Exercícios', icon: ListChecks },
  // { to: '/aluno/provas', label: 'Provas', icon: FileText },
];

export default function AlunoShell() {
  const clear = useAuth((s) => s.clear);
  return (
    <div className="min-h-screen grid md:grid-cols-[220px_1fr]">
      <aside className="hidden md:block border-r border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/30 backdrop-blur">
        <div className="px-5 py-4 font-semibold">Área do Aluno</div>
        <nav className="px-2 py-2">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end as any}
              className={({ isActive }) =>
                ['flex items-center gap-3 px-3 py-2 rounded-lg transition',
                 isActive ? 'bg-[var(--brand-primary)] text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'].join(' ')
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
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="md:hidden font-semibold">Aluno</div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button className="btn btn-ghost" onClick={clear}><LogOut size={18}/><span className="hidden sm:inline">Sair</span></button>
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto p-4"><Outlet /></main>
      </div>
    </div>
  );
}
