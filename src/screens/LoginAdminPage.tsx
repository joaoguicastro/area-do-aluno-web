/* eslint-disable @typescript-eslint/no-unused-vars */
// src/screens/LoginAdminPage.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../auth/store';
import { fetchProfile } from '../services/auth';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

export default function LoginAdminPage() {
  const setToken = useAuth((s) => s.setToken);
  const setProfile = useAuth((s) => s.setProfile);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      const { data } = await api.post('/auth/login', { email: email.trim(), senha });

      const token = data.token ?? data.accessToken ?? data.access_token;
      if (!token) throw new Error('auth');

      setToken(token);

      const p = await fetchProfile(token);
      if (p) setProfile(p);

      window.location.href = '/admin';
    } catch (_) {
      setErr('E-mail ou senha incorretos.');
      setSenha('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-semibold mb-4">Entrar (Admin)</h1>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <div className="label">E-mail</div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@exemplo.com"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <div className="label">Senha</div>
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {err && <p className="text-red-600 text-sm">{err}</p>}

          <Button disabled={loading} className="w-full">
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
