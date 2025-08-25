import { useEffect, useState } from 'react';
import { useAuth } from './store';
import { fetchProfile } from '../services/auth';

export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token);
  const setProfile = useAuth((s) => s.setProfile);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (token) {
        const p = await fetchProfile(token);
        if (mounted) setProfile(p ?? null);
      } else {
        setProfile(null);
      }
      if (mounted) setReady(true);
    })();
    return () => { mounted = false; };
  }, [token, setProfile]);

  if (!ready) return <div className="p-6 text-sm text-[color:var(--text-muted)]">Carregando…</div>;
  return <>{children}</>;
}
