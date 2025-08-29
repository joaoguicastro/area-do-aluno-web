/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { Button } from '../../../ui/Button';
import { ConfirmModal } from '../../../ui/Delete';

import {
  registerUser,
  listFuncionarios,
  updateFuncionario,
  deleteFuncionario,
  type Funcionario,
  type UserRole,
} from '../../../services/users';

import { useAuth } from '../../../auth/store';
import { useDebounce } from '../../../utils/useDebounce';
import { Plus, Trash2, Pencil } from 'lucide-react';

const roles: UserRole[] = ['MASTER', 'ADMIN', 'OPERADOR', 'PROFESSOR'];

export default function FuncionariosPage() {
  const qc = useQueryClient();

  // Gate MASTER
  const role = useAuth((s) => s.profile?.role ?? null);
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

  // ---------- Form de criação ----------
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    role: 'ADMIN' as UserRole,
  });
  const [creating, setCreating] = useState(false);
  const [errCreate, setErrCreate] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErrCreate(null);
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
      await qc.invalidateQueries({ queryKey: ['funcionarios'] });
    } catch (e: any) {
      setErrCreate(e?.response?.data?.message ?? e?.message ?? 'Erro ao cadastrar funcionário.');
    } finally {
      setCreating(false);
    }
  }

  // ---------- Lista / busca / paginação ----------
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 300);
  const [page, setPage] = useState(1);

  const { data, isFetching, error } = useQuery({
    queryKey: ['funcionarios', { q: debounced, page }],
    queryFn: () => listFuncionarios({ q: debounced || undefined, page, perPage: 10 }),
    staleTime: 1000 * 10,
  });

  const total = data?.total ?? 0;
  const perPage = data?.perPage ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // ---------- Editar ----------
  const [openEdit, setOpenEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errEdit, setErrEdit] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formEdit, setFormEdit] = useState<{
    nome: string;
    email: string;
    role: UserRole;
    senha: string; // opcional
  }>({ nome: '', email: '', role: 'ADMIN', senha: '' });

  function openEditModal(row: Funcionario) {
    setEditingId(row.id);
    setFormEdit({ nome: row.nome, email: row.email, role: row.role, senha: '' });
    setErrEdit(null);
    setOpenEdit(true);
  }

  // helper para montar o "delta" apenas com o que mudou
function buildDelta(original: Funcionario, edit: { nome: string; email: string; role: UserRole; senha: string }) {
  const delta: any = {};
  if (edit.nome.trim() !== original.nome) delta.nome = edit.nome.trim();
  if (edit.email.trim() !== original.email) delta.email = edit.email.trim();
  if (edit.role !== original.role) delta.role = edit.role;
  if (edit.senha.trim()) delta.senha = edit.senha.trim(); // só manda senha se preenchida
  return delta;
}

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setErrEdit(null);
    try {
    // pega o original da lista atual
    const original = data?.data?.find((u) => u.id === editingId);
    if (!original) throw new Error('Funcionário não encontrado na lista.');

    const delta = buildDelta(original, formEdit);

    // se não mudou nada, evita PUT vazio
    if (Object.keys(delta).length === 0) {
      setErrEdit('Nenhuma alteração para salvar.');
      setSaving(false);
      return;
    }

    await updateFuncionario(editingId, delta);
    setOpenEdit(false);
    setEditingId(null);
    await qc.invalidateQueries({ queryKey: ['funcionarios'] });
  } catch (e: any) {
    setErrEdit(e?.response?.data?.message ?? 'Erro ao salvar alterações');
  } finally {
    setSaving(false);
  }
}


  // ---------- Excluir ----------
  const [deleteId, setDeleteId] = useState<string | null>(null);
  async function confirmDelete() {
    if (!deleteId) return;
    await deleteFuncionario(deleteId);
    setDeleteId(null);
    await qc.invalidateQueries({ queryKey: ['funcionarios'] });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Funcionários</h1>

      {/* Criar */}
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

          {errCreate && (
            <div className="sm:col-span-2">
              <p className="text-red-600 text-sm">{errCreate}</p>
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

      {/* Lista */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3">
          <Input
            placeholder="Buscar por nome ou e-mail…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
          <div className="text-xs text-[color:var(--text-muted)] ml-auto">
            {isFetching ? 'Atualizando…' : `${data?.data?.length ?? 0} / ${total} itens`}
          </div>
        </div>

        {error ? (
          <div className="p-4 text-red-600">Erro ao carregar funcionários.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[color:var(--text-muted)]">
                    <th className="py-2">Nome</th>
                    <th className="py-2">E-mail</th>
                    <th className="py-2">Papel</th>
                    <th className="py-2">Criado</th>
                    <th className="py-2 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map((u: Funcionario) => (
                    <tr key={u.id} className="border-t border-black/5">
                      <td className="py-3">{u.nome}</td>
                      <td className="py-3">{u.email}</td>
                      <td className="py-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button className="btn btn-ghost" title="Editar" onClick={() => openEditModal(u)}>
                            <Pencil size={16} />
                          </button>
                          <button
                            className="btn btn-ghost text-red-600"
                            title="Excluir"
                            onClick={() => setDeleteId(u.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!isFetching && (data?.data?.length ?? 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[color:var(--text-muted)]">
                        Nenhum funcionário encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-3 px-3 pb-3">
              <div />
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-ghost"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <div className="text-sm">
                  {page} / {totalPages}
                </div>
                <button
                  className="btn btn-ghost"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Modal Editar */}
      {openEdit && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
          <div className="card w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Editar funcionário</h2>
            <form onSubmit={handleEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <div className="label">Nome</div>
                <Input
                  value={formEdit.nome}
                  onChange={(e) => setFormEdit({ ...formEdit, nome: e.target.value })}
                  required
                />
              </div>

              <div>
                <div className="label">E-mail</div>
                <Input
                  type="email"
                  value={formEdit.email}
                  onChange={(e) => setFormEdit({ ...formEdit, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <div className="label">Nova senha (opcional)</div>
                <Input
                  type="password"
                  value={formEdit.senha}
                  onChange={(e) => setFormEdit({ ...formEdit, senha: e.target.value })}
                  placeholder="deixe em branco para manter"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="label">Papel</div>
                <select
                  className="input"
                  value={formEdit.role}
                  onChange={(e) => setFormEdit({ ...formEdit, role: e.target.value as UserRole })}
                  required
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {errEdit && (
                <div className="sm:col-span-2">
                  <p className="text-red-600 text-sm">{errEdit}</p>
                </div>
              )}

              <div className="sm:col-span-2 flex items-center justify-end">
                <Button disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Excluir */}
      <ConfirmModal
        open={!!deleteId}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
