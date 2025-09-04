/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../auth/store';
import { fetchProfile } from '../services/auth';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';

export default function LoginPageAluno() {
  const setToken = useAuth((s) => s.setToken);
  const setProfile = useAuth((s) => s.setProfile);

  const [cpfOrMatricula, setCpfOrMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      const body = { cpfOrMatricula: cpfOrMatricula.trim(), senha };
      const { data } = await api.post('/auth/login', body);

      // o back retorna { token, role, aluno, financeLock? }
      const token: string = data.token ?? data.accessToken ?? data.access_token;
      if (!token) throw new Error('auth');

      setToken(token);

      // busca o perfil normal
      const p = await fetchProfile(token);

      // injeta o financeLock que veio do /auth/login (se houver)
      const financeLock = (data.financeLock ?? null) as
        | { active: boolean; limite: number; maiorAtraso: number }
        | null;

      if (p) setProfile({ ...p, financeLock });

      // redireciona: se estiver com bloqueio financeiro ativo, manda para a página de financeiro
      if (financeLock?.active) {
        window.location.href = '/aluno/financeiro';
      } else {
        window.location.href = '/aluno';
      }
    } catch (_e) {
      setErr('CPF/matrícula ou senha incorretos.');
      setSenha('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="text-xl font-semibold mb-4">Bem-Vindo à Área do Aluno</h1>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <div className="label">CPF ou Matrícula</div>
            <Input
              value={cpfOrMatricula}
              onChange={(e) => setCpfOrMatricula(e.target.value)}
              placeholder="123.456.789-09 ou 2025-INF-000123"
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
