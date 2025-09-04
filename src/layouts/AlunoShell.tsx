/* eslint-disable @typescript-eslint/no-explicit-any */
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { Home, GraduationCap, LogOut, User, Wallet } from 'lucide-react';
import ThemeToggle from '../theme/ThemeToggle';
import { useAuth } from '../auth/store';
import { useQuery } from '@tanstack/react-query';
import { getFinanceGate } from '../services/financeiro';

const logoUrl = '/logo.png';

function Brand({ compact = false, to = '/aluno' }: { compact?: boolean; to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2">
      <picture>
        <source srcSet={logoUrl} type="image/svg+xml" />
        <img
          src={logoUrl}
          alt="Infinity Cursos"
          className={compact ? 'h-6 w-auto' : 'h-8 w-auto'}
          loading="eager"
          fetchPriority="high"
        />
      </picture>
      {!compact && <span className="font-semibold">Área do Aluno</span>}
    </Link>
  );
}

export default function AlunoShell() {
  const clear = useAuth((s) => s.clear);
  const profile = useAuth((s) => s.profile);
  const isAluno = (profile?.role ?? '') === 'ALUNO';

  // pergunta ao back se deve bloquear a navegação
  const gateQ = useQuery({
    queryKey: ['financeiro-gate'],
    queryFn: getFinanceGate,
    enabled: isAluno,       // só aluno consulta
    staleTime: 15_000,
  });

  const locked = !!gateQ.data?.requireFinance; // true = só mostrar Financeiro

  const navLinks = useMemo(() => {
    if (locked) {
      return [
        { to: '/aluno/financeiro', label: 'Financeiro', icon: Wallet, end: true },
      ];
    }
    return [
        { to: '/aluno', label: 'Início', icon: Home, end: true },
        { to: '/aluno/cursos', label: 'Meus Cursos', icon: GraduationCap },
        { to: '/aluno/financeiro', label: 'Financeiro', icon: Wallet },
        { to: '/aluno/perfil', label: 'Perfil', icon: User },
    ];
  }, [locked]);

  // Redireciona automaticamente quem está bloqueado para /aluno/financeiro
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!locked) return;
    if (!location.pathname.startsWith('/aluno/financeiro')) {
      navigate('/aluno/financeiro', { replace: true });
    }
  }, [locked, location.pathname, navigate]);

  const brandTarget = locked ? '/aluno/financeiro' : '/aluno';

  return (
    <div className="min-h-screen grid md:grid-cols-[240px_1fr]">
      {/* SIDEBAR */}
      <aside className="hidden md:flex md:flex-col border-r border-black/10 dark:border-white/10 bg-white/70 dark:bg-black/30 backdrop-blur">
        {/* Topo com LOGO */}
        <div className="px-5 py-4 border-b border-black/10 dark:border-white/10">
          <Brand to={brandTarget} />
        </div>

        {/* Navegação */}
        <nav className="px-2 py-3 space-y-1">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end as any}
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

      {/* CONTEÚDO */}
      <div className="min-h-screen">
        {/* Header (mobile) com LOGO compacto */}
        <header className="sticky top-0 z-10 bg-[var(--surface-bg)]/80 backdrop-blur border-b border-black/10 dark:border-white/10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="md:hidden">
              <Brand compact to={brandTarget} />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button className="btn btn-ghost" onClick={clear}>
                <LogOut size={18} />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
