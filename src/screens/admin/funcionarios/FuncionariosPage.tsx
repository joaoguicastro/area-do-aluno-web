/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { Button } from '../../../ui/Button';
import { registerUser, type UserRole } from '../../../services/users';
import { useAuth } from '../../../auth/store';

const roles: UserRole[] = ['MASTER', 'ADMIN', 'OPERADOR', 'PROFESSOR'];

export default function FuncionariosPage() {
  const role = useAuth((s) => s.role); // seu login admin retorna 'role' no store
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    role: 'ADMIN' as UserRole,
  });
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // Gate simples no front
  if (role !== 'MASTER') {
    return (
      <Card>
        <h1 className="text-lg font-semibold mb-2">Acesso restrito</h1>
        <p className="text-sm text-[color:var(--text-muted)]">
          Esta seção é exclusiva para usuários com papel <strong>MASTER</strong>.
        </p>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErr(null);
    setOkMsg(null);

    try {
      if (!form.nome.trim()) throw new Error('Informe o nome.');
      if (!form.email.trim()) throw new Error('Informe o e-mail.');
      if (form.senha.length < 6) throw new Error('A senha deve ter ao menos 6 caracteres.');

      await registerUser({
        nome: form.nome.trim(),
        email: form.email.trim(),
        senha: form.senha,
        role: form.role,
      });

      setOkMsg('Funcionário cadastrado com sucesso.');
      setForm({ nome: '', email: '', senha: '', role: 'ADMIN' });
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Erro ao cadastrar funcionário.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Funcionários</h1>

      <Card>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <div className="label">Nome</div>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </div>

          <div>
            <div className="label">E-mail</div>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div>
            <div className="label">Senha</div>
            <Input
              type="password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              placeholder="mín. 6 caracteres"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <div className="label">Papel</div>
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <p className="text-xs text-[color:var(--text-muted)] mt-1">
              Apenas usuários com papel <strong>MASTER</strong> podem criar novos funcionários.
            </p>
          </div>

          {err && (
            <div className="sm:col-span-2">
              <p className="text-red-600 text-sm">{err}</p>
            </div>
          )}
          {okMsg && (
            <div className="sm:col-span-2">
              <p className="text-green-600 text-sm">{okMsg}</p>
            </div>
          )}

          <div className="sm:col-span-2 flex items-center justify-end">
            <Button disabled={creating}>{creating ? 'Salvando…' : 'Cadastrar'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
