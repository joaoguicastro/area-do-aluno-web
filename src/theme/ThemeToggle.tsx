import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return (
    <button className="btn btn-ghost" onClick={() => setDark(d => !d)} aria-label="Alternar tema">
      {dark ? <Sun size={18}/> : <Moon size={18}/>}
      <span className="hidden sm:inline ml-1">{dark ? 'Claro' : 'Escuro'}</span>
    </button>
  );
}
