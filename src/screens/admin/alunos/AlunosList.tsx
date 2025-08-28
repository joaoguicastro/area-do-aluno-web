/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listAlunos, createAluno, deleteAluno } from '../../../services/alunos';
import type { Aluno, CreateAlunoPayload } from '../../../services/alunos';
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { useDebounce } from '../../../utils/useDebounce';
import { Plus, Trash2 } from 'lucide-react';

// --------- helpers ----------
function onlyDigits(v: string) {
  return (v || '').replace(/\D/g, '');
}
function maskCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (!d) return '';
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}
function maskDMY(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
function toISOFromDMY(dmy: string): string | null {
  const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  const ok =
    d.getFullYear() === Number(yyyy) &&
    d.getMonth() === Number(mm) - 1 &&
    d.getDate() === Number(dd);
  return ok ? `${yyyy}-${mm}-${dd}` : null;
}
// ----------------------------

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

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState<{
    nome: string;
    cpfAluno: string;
    dataNascimentoAluno: string;         // DD/MM/AAAA (UI)
    nomeResponsavel: string;
    cpfResponsavel: string;
    dataNascimentoResponsavel: string;   // DD/MM/AAAA (UI)
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    telefone: string;
    email: string;
    fotoUrl: string;
    senha: string;
    prefixoMatricula: string;
  }>({
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
      // Validar e converter datas
      const isoAluno = toISOFromDMY(form.dataNascimentoAluno);
      if (!isoAluno) {
        setErr('Data de nascimento do aluno inválida. Use DD/MM/AAAA.');
        setCreating(false);
        return;
      }
      const isoResp = toISOFromDMY(form.dataNascimentoResponsavel);
      if (!isoResp) {
        setErr('Data de nascimento do responsável inválida. Use DD/MM/AAAA.');
        setCreating(false);
        return;
      }

      const payload: CreateAlunoPayload = {
        nome: form.nome.trim(),
        cpfAluno: onlyDigits(form.cpfAluno),
        dataNascimentoAluno: isoAluno, // ISO p/ Zod z.coerce.date()
        nomeResponsavel: form.nomeResponsavel.trim(),
        cpfResponsavel: onlyDigits(form.cpfResponsavel),
        dataNascimentoResponsavel: isoResp, // ISO
        rua: form.rua.trim(),
        numero: form.numero.trim(),
        bairro: form.bairro.trim(),
        cidade: form.cidade.trim(),

        // >>> DIFERENÇA PRINCIPAL: opcionais como undefined (não null)
        telefone: form.telefone ? form.telefone.trim() : undefined,
        email: form.email ? form.email.trim() : undefined,
        fotoUrl: form.fotoUrl ? form.fotoUrl.trim() : undefined,

        senha: form.senha,
        prefixoMatricula: form.prefixoMatricula || 'INF',
      };

      await createAluno(payload);
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
      const apiMsg =
        e?.response?.data?.issues?.[0]?.message ||
        e?.response?.data?.message ||
        'Erro ao criar aluno';
      setErr(apiMsg);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este aluno?')) return;
    await deleteAluno(id);
    await qc.invalidateQueries({ queryKey: ['alunos'] });
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
                <th className="py-2 w-24"></th>
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
                  <td className="py-3">
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
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    required
                  />
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
                    placeholder="DD/MM/AAAA"
                    value={form.dataNascimentoAluno}
                    onChange={(e) =>
                      setForm({ ...form, dataNascimentoAluno: maskDMY(e.target.value) })
                    }
                    required
                  />
                </div>

                <div>
                  <div className="label">Telefone</div>
                  <Input
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  />
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
                  <Input
                    value={form.fotoUrl}
                    onChange={(e) => setForm({ ...form, fotoUrl: e.target.value })}
                  />
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
                    placeholder="DD/MM/AAAA"
                    value={form.dataNascimentoResponsavel}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        dataNascimentoResponsavel: maskDMY(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="label">Rua</div>
                  <Input
                    value={form.rua}
                    onChange={(e) => setForm({ ...form, rua: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <div className="label">Número</div>
                  <Input
                    value={form.numero}
                    onChange={(e) => setForm({ ...form, numero: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <div className="label">Bairro</div>
                  <Input
                    value={form.bairro}
                    onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                    required
                  />
                </div>

                <div className="sm:col-span-3">
                  <div className="label">Cidade</div>
                  <Input
                    value={form.cidade}
                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                    required
                  />
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
    </div>
  );
}
