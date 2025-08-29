/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../auth/store';
import { fetchProfile } from '../services/auth';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

function normalizeRole(r: any): 'ADMIN' | 'ALUNO' | 'MASTER'  {
  const s = String(r ?? '').toLowerCase();
  if (s === 'aluno') return 'ALUNO';
  if (s === 'master') return 'MASTER';
  return 'ADMIN';
}

export default function LoginPage() {
  const setToken = useAuth((s) => s.setToken);
  const setProfile = useAuth((s) => s.setProfile);
  const setManualRole = useAuth((s) => s.setManualRole);

  const [email, setEmail] = useState('');
  const [cpfOrMatricula, setCpfOrMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [roleChoice, setRoleChoice] = useState<'ADMIN' | 'ALUNO'>('ADMIN');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const body =
        roleChoice === 'ALUNO'
          ? { cpfOrMatricula: cpfOrMatricula.trim(), senha }
          : { email: email.trim(), senha };

      // 👇 sua rota correta
      const { data } = await api.post('/auth/login', body);

      const token = data.token ?? data.accessToken ?? data.access_token;
      if (!token) throw new Error('Token não encontrado na resposta.');
      setToken(token);

      const p = await fetchProfile(token);
      if (p) {
        setProfile(p);
        window.location.href = p.role === 'ALUNO' ? '/aluno' : '/admin';
        return;
      }

      const serverRole = normalizeRole(data.role);
      setManualRole(serverRole);
      window.location.href = serverRole === 'ALUNO' ? '/aluno' : '/admin';
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Falha no login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-semibold mb-4">Entrar</h1>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <div className="label">Entrar como</div>
            <div className="flex gap-2">
              <button
                type="button"
                className={`btn ${roleChoice === 'ADMIN' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setRoleChoice('ADMIN')}
              >
                Admin
              </button>
              <button
                type="button"
                className={`btn ${roleChoice === 'ALUNO' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setRoleChoice('ALUNO')}
              >
                Aluno
              </button>
            </div>
          </div>

          {roleChoice === 'ALUNO' ? (
            <>
              <div>
                <div className="label">CPF ou Matrícula</div>
                <Input
                  value={cpfOrMatricula}
                  onChange={(e) => setCpfOrMatricula(e.target.value)}
                  placeholder="123.456.789-09 ou 2025-INF-000123"
                  autoComplete="username"
                />
              </div>
              <div>
                <div className="label">Senha</div>
                <Input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="label">E-mail</div>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@exemplo.com"
                  autoComplete="username"
                />
              </div>
              <div>
                <div className="label">Senha</div>
                <Input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </>
          )}

          {err && <p className="text-red-600 text-sm">{err}</p>}

          <Button disabled={loading} className="w-full">
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
