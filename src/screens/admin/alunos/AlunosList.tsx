/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
import { useState} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listAlunos, createAluno, deleteAluno, updateAluno } from '../../../services/alunos';
import type { Aluno, CreateAlunoPayload } from '../../../services/alunos';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { useDebounce } from '../../../utils/useDebounce';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { maskPhoneBR } from '../../../utils/maskPhoneBR';

function onlyDigits(v: string) {
  return (v || '').replace(/\D/g, '');
}
function maskCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

// Datas no padrão BR (DD/MM/YYYY)
function maskDateBR(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return d.replace(/^(\d{2})(\d{1,2})/, '$1/$2');
  return d.replace(/^(\d{2})(\d{2})(\d{1,4})/, '$1/$2/$3');
}
function brToISO(v: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return null;
  const [_, dd, mm, yyyy] = m;
  const d = Number(dd), mth = Number(mm);
  if (d < 1 || d > 31 || mth < 1 || mth > 12) return null;
  return `${yyyy}-${mm}-${dd}`;
}
function isoToBR(v?: string | null): string {
  if (!v) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export default function AlunosList() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q);

  const { data, isFetching, error } = useQuery({
    queryKey: ['alunos', { q: debounced, page }],
    queryFn: () => listAlunos({ q: debounced || undefined, page, perPage: 10 }),
    staleTime: 1000 * 10,
  });

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-600">Erro ao carregar alunos.</p>
      </div>
    );
  }

  // ======= Modal Criar =======
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: '',
    cpfAluno: '',
    dataNascimentoAluno: '',
    nomeResponsavel: '',
    cpfResponsavel: '',
    dataNascimentoResponsavel: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    telefone: '',
    email: '',
    fotoUrl: '',
    senha: '',
    prefixoMatricula: 'INF',
  });

  async function handleCreate(e: React.FormEvent) {
  e.preventDefault();
  setCreating(true);
  setErr(null);
  try {
    const payload: CreateAlunoPayload = {
      nome: form.nome.trim(),
      cpfAluno: onlyDigits(form.cpfAluno),
      dataNascimentoAluno: brToISO(form.dataNascimentoAluno) ?? '',
      nomeResponsavel: form.nomeResponsavel.trim(),
      cpfResponsavel: onlyDigits(form.cpfResponsavel),
      dataNascimentoResponsavel: brToISO(form.dataNascimentoResponsavel) ?? '',
      rua: form.rua.trim(),
      numero: form.numero.trim(),
      bairro: form.bairro.trim(),
      cidade: form.cidade.trim(),
      // NÃO envie null — deixe undefined/omita
      telefone: form.telefone ? form.telefone.trim() : undefined,
      email: form.email ? form.email.trim() : undefined,
      fotoUrl: form.fotoUrl ? form.fotoUrl.trim() : undefined,
      senha: form.senha,
      prefixoMatricula: form.prefixoMatricula || 'INF',
    };

    // remove chaves vazias/null/undefined
    const body = Object.fromEntries(
      Object.entries(payload).filter(([, v]) => v !== null && v !== undefined && v !== '')
    ) as CreateAlunoPayload;

    await createAluno(body);
    setOpen(false);
    setForm({
      nome: '',
      cpfAluno: '',
      dataNascimentoAluno: '',
      nomeResponsavel: '',
      cpfResponsavel: '',
      dataNascimentoResponsavel: '',
      rua: '',
      numero: '',
      bairro: '',
      cidade: '',
      telefone: '',
      email: '',
      fotoUrl: '',
      senha: '',
      prefixoMatricula: 'INF',
    });
    await qc.invalidateQueries({ queryKey: ['alunos'] });
  } catch (e: any) {
    setErr(e?.response?.data?.message ?? 'Erro ao criar aluno');
  } finally {
    setCreating(false);
  }
}

  async function handleDelete(id: string) {
    if (!confirm('Excluir este aluno?')) return;
    await deleteAluno(id);
    await qc.invalidateQueries({ queryKey: ['alunos'] });
  }

  // ======= Modal Editar / Ver =======
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Aluno | null>(null);

  const [editForm, setEditForm] = useState({
    nome: '',
    cpfAluno: '',
    dataNascimentoAluno: '',
    nomeResponsavel: '',
    cpfResponsavel: '',
    dataNascimentoResponsavel: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    telefone: '',
    email: '',
    fotoUrl: '',
  });

  function openEdit(a: Aluno) {
    setSelected(a);
    setEditForm({
      nome: a.nome ?? '',
      cpfAluno: maskCPF(a.cpfAluno ?? ''),
      dataNascimentoAluno: isoToBR(a.dataNascimentoAluno),
      nomeResponsavel: a.nomeResponsavel ?? '',
      cpfResponsavel: maskCPF(a.cpfResponsavel ?? ''),
      dataNascimentoResponsavel: isoToBR(a.dataNascimentoResponsavel),
      rua: a.rua ?? '',
      numero: a.numero ?? '',
      bairro: a.bairro ?? '',
      cidade: a.cidade ?? '',
      telefone: maskPhoneBR(a.telefone ?? ''),
      email: a.email ?? '',
      fotoUrl: a.fotoUrl ?? '',
    });
    setEditErr(null);
    setEditOpen(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setEditErr(null);
    try {
      await updateAluno(selected.id, {
        nome: editForm.nome.trim(),
        cpfAluno: onlyDigits(editForm.cpfAluno),
        dataNascimentoAluno: brToISO(editForm.dataNascimentoAluno) ?? undefined,
        nomeResponsavel: editForm.nomeResponsavel.trim(),
        cpfResponsavel: onlyDigits(editForm.cpfResponsavel),
        dataNascimentoResponsavel: brToISO(editForm.dataNascimentoResponsavel) ?? undefined,
        rua: editForm.rua.trim(),
        numero: editForm.numero.trim(),
        bairro: editForm.bairro.trim(),
        cidade: editForm.cidade.trim(),
        telefone: editForm.telefone ? editForm.telefone.trim() : undefined,
        email: editForm.email ? editForm.email.trim() : undefined,
        fotoUrl: editForm.fotoUrl ? editForm.fotoUrl.trim() : undefined,
      });
      setEditOpen(false);
      setSelected(null);
      await qc.invalidateQueries({ queryKey: ['alunos'] });
    } catch (e: any) {
      setEditErr(e?.response?.data?.message ?? 'Erro ao atualizar aluno');
    } finally {
      setSaving(false);
    }
  }

  const total = data?.total ?? 0;
  const perPage = data?.perPage ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-semibold">Alunos</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por nome, CPF ou matrícula…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Novo aluno
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[color:var(--text-muted)]">
                <th className="py-2">Nome</th>
                <th className="py-2">CPF</th>
                <th className="py-2">Matrícula</th>
                <th className="py-2">E-mail</th>
                <th className="py-2">Cidade</th>
                <th className="py-2 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((a: Aluno) => (
                <tr key={a.id} className="border-t border-black/5">
                  <td className="py-3">{a.nome}</td>
                  <td className="py-3">{maskCPF(a.cpfAluno)}</td>
                  <td className="py-3">{a.matricula}</td>
                  <td className="py-3">{a.email ?? '—'}</td>
                  <td className="py-3">{a.cidade}</td>
                  <td className="py-3 flex gap-2">
                    <button
                      className="btn btn-ghost"
                      title="Ver / Editar"
                      onClick={() => openEdit(a)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="btn btn-ghost text-red-600"
                      title="Excluir"
                      onClick={() => handleDelete(a.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!isFetching && (data?.data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[color:var(--text-muted)]">
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-[color:var(--text-muted)]">
            {isFetching ? 'Atualizando…' : `${data?.data?.length ?? 0} / ${total} itens`}
          </div>
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
      </Card>

      {/* Modal de criação */}
      {open && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
          <div className="card w-full max-w-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Novo aluno</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="label">Nome</div>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
                </div>
                <div>
                  <div className="label">CPF do aluno</div>
                  <Input
                    value={form.cpfAluno}
                    onChange={(e) => setForm({ ...form, cpfAluno: maskCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    required
                  />
                </div>
                <div>
                  <div className="label">Data de nascimento (aluno)</div>
                  <Input
                    value={form.dataNascimentoAluno}
                    onChange={(e) => setForm({ ...form, dataNascimentoAluno: maskDateBR(e.target.value) })}
                    placeholder="DD/MM/AAAA"
                    required
                  />
                </div>
                <div>
                  <div className="label">Telefone</div>
                  <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: maskPhoneBR(e.target.value) })} />
                </div>
                <div>
                  <div className="label">E-mail</div>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <div className="label">URL da foto (opcional)</div>
                  <Input value={form.fotoUrl} onChange={(e) => setForm({ ...form, fotoUrl: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="label">Nome do responsável</div>
                  <Input
                    value={form.nomeResponsavel}
                    onChange={(e) => setForm({ ...form, nomeResponsavel: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <div className="label">CPF do responsável</div>
                  <Input
                    value={form.cpfResponsavel}
                    onChange={(e) => setForm({ ...form, cpfResponsavel: maskCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    required
                  />
                </div>
                <div>
                  <div className="label">Data de nascimento (responsável)</div>
                  <Input
                    value={form.dataNascimentoResponsavel}
                    onChange={(e) => setForm({ ...form, dataNascimentoResponsavel: maskDateBR(e.target.value) })}
                    placeholder="DD/MM/AAAA"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="label">Rua</div>
                  <Input value={form.rua} onChange={(e) => setForm({ ...form, rua: e.target.value })} required />
                </div>
                <div>
                  <div className="label">Número</div>
                  <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} required />
                </div>
                <div>
                  <div className="label">Bairro</div>
                  <Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} required />
                </div>
                <div className="sm:col-span-3">
                  <div className="label">Cidade</div>
                  <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="label">Senha de acesso</div>
                  <Input
                    type="password"
                    value={form.senha}
                    onChange={(e) => setForm({ ...form, senha: e.target.value })}
                    placeholder="mín. 6 caracteres"
                    required
                  />
                </div>
                <div>
                  <div className="label">Prefixo da matrícula</div>
                  <Input
                    value={form.prefixoMatricula}
                    onChange={(e) => setForm({ ...form, prefixoMatricula: e.target.value })}
                    placeholder="INF"
                  />
                </div>
              </div>

              {err && <p className="text-red-600 text-sm">{err}</p>}

              <div className="flex items-center justify-end gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </button>
                <Button disabled={creating}>{creating ? 'Salvando…' : 'Salvar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de ver/editar */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
          <div className="card w-full max-w-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Dados do aluno</h2>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="label">Nome</div>
                  <Input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} />
                </div>
                <div>
                  <div className="label">CPF do aluno</div>
                  <Input
                    value={editForm.cpfAluno}
                    onChange={(e) => setEditForm({ ...editForm, cpfAluno: maskCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <div className="label">Data de nascimento (aluno)</div>
                  <Input
                    value={editForm.dataNascimentoAluno}
                    onChange={(e) => setEditForm({ ...editForm, dataNascimentoAluno: maskDateBR(e.target.value) })}
                    placeholder="DD/MM/AAAA"
                  />
                </div>
                <div>
                  <div className="label">Telefone</div>
                  <Input value={editForm.telefone} onChange={(e) => setEditForm({ ...editForm, telefone: maskPhoneBR(e.target.value) })} />
                </div>
                <div>
                  <div className="label">E-mail</div>
                  <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div>
                  <div className="label">URL da foto</div>
                  <Input value={editForm.fotoUrl} onChange={(e) => setEditForm({ ...editForm, fotoUrl: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="label">Nome do responsável</div>
                  <Input value={editForm.nomeResponsavel} onChange={(e) => setEditForm({ ...editForm, nomeResponsavel: e.target.value })} />
                </div>
                <div>
                  <div className="label">CPF do responsável</div>
                  <Input
                    value={editForm.cpfResponsavel}
                    onChange={(e) => setEditForm({ ...editForm, cpfResponsavel: maskCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <div className="label">Nascimento (responsável)</div>
                  <Input
                    value={editForm.dataNascimentoResponsavel}
                    onChange={(e) => setEditForm({ ...editForm, dataNascimentoResponsavel: maskDateBR(e.target.value) })}
                    placeholder="DD/MM/AAAA"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="label">Rua</div>
                  <Input value={editForm.rua} onChange={(e) => setEditForm({ ...editForm, rua: e.target.value })} />
                </div>
                <div>
                  <div className="label">Número</div>
                  <Input value={editForm.numero} onChange={(e) => setEditForm({ ...editForm, numero: e.target.value })} />
                </div>
                <div>
                  <div className="label">Bairro</div>
                  <Input value={editForm.bairro} onChange={(e) => setEditForm({ ...editForm, bairro: e.target.value })} />
                </div>
                <div className="sm:col-span-3">
                  <div className="label">Cidade</div>
                  <Input value={editForm.cidade} onChange={(e) => setEditForm({ ...editForm, cidade: e.target.value })} />
                </div>
              </div>

              {editErr && <p className="text-red-600 text-sm">{editErr}</p>}

              <div className="flex items-center justify-end gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setEditOpen(false)}>
                  Fechar
                </button>
                <Button disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
