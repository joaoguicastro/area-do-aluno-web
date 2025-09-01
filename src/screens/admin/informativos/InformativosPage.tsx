/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { Button } from '../../../ui/Button';
import { Textarea } from '../../../ui/Textarea';
import { useDebounce } from '../../../utils/useDebounce';
import { Trash2, Plus } from 'lucide-react';

import { listCursos, type Curso, getCursoById } from '../../../services/cursos';
import { listTurmasByCursoId, type Turma, getTurmaById } from '../../../services/turmas';
import { listAlunos, type Aluno, getAlunoById } from '../../../services/alunos';

import {
  listInformativosAdmin,
  createInformativo,
  deleteInformativo,
  type Informativo,
  type InformativoPublico,
} from '../../../services/informativos';

export default function InformativosPage() {
  const qc = useQueryClient();

  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q);

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // listagem principal
  const query = useQuery({
    queryKey: ['informativos', { q: debounced, page }],
    queryFn: () => listInformativosAdmin({ q: debounced || undefined, page, perPage: 10 }),
    staleTime: 1000 * 10,
  });

  // selects auxiliares
  const cursosQuery = useQuery({
    queryKey: ['cursos-for-select'],
    queryFn: () => listCursos({ page: 1, perPage: 200 }),
    staleTime: 1000 * 60 * 5,
  });

  const alunosQuery = useQuery({
    queryKey: ['alunos-for-select'],
    queryFn: () => listAlunos({ page: 1, perPage: 200 }),
    staleTime: 1000 * 60 * 5,
  });

  // form de criação
  const [form, setForm] = useState<{
    titulo: string;
    conteudo: string;
    publico: InformativoPublico;
    cursoId: string;
    turmaId: string;
    alunoId: string;
  }>({
    titulo: '',
    conteudo: '',
    publico: 'ALL',
    cursoId: '',
    turmaId: '',
    alunoId: '',
  });

  // carrega turmas quando curso muda
  const turmasQuery = useQuery({
    queryKey: ['turmas-by-curso', form.cursoId],
    queryFn: async () => {
      if (!form.cursoId) return [] as Turma[];
      return listTurmasByCursoId(form.cursoId);
    },
    enabled: !!form.cursoId,
    staleTime: 1000 * 60 * 5,
  });

  const cursosMap = useMemo(() => {
    const m: Record<string, string> = {};
    cursosQuery.data?.data?.forEach((c: Curso) => (m[c.id] = c.nome));
    return m;
  }, [cursosQuery.data]);

  const alunosMap = useMemo(() => {
    const m: Record<string, string> = {};
    alunosQuery.data?.data?.forEach((a: Aluno) => (m[a.id] = a.nome));
    return m;
  }, [alunosQuery.data]);

  const turmasMap = useMemo(() => {
    const m: Record<string, string> = {};
    (turmasQuery.data ?? []).forEach((t: Turma) => (m[t.id] = t.nome));
    return m;
  }, [turmasQuery.data]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setErr(null);

    try {
      if (!form.titulo.trim()) throw new Error('Informe o título');
      if (!form.conteudo.trim()) throw new Error('Escreva a mensagem');

      // Monta payload e valida IDs de acordo com o público
      const payload: any = {
        titulo: form.titulo.trim(),
        conteudo: form.conteudo.trim(),
        publico: form.publico,
      };

      if (form.publico === 'CURSO') {
        if (!form.cursoId) throw new Error('Selecione o curso.');
        const curso = await getCursoById(form.cursoId).catch(() => null);
        if (!curso) throw new Error('Curso não encontrado.');
        payload.cursoId = curso.id;
      }

      if (form.publico === 'TURMA') {
        if (!form.cursoId || !form.turmaId) throw new Error('Selecione o curso e a turma.');
        const turma = await getTurmaById(form.turmaId).catch(() => null);
        if (!turma) throw new Error('Turma não encontrada.');
        if (turma.cursoId !== form.cursoId) throw new Error('A turma não pertence ao curso selecionado.');
        payload.turmaId = turma.id;
      }

      if (form.publico === 'ALUNO') {
        if (!form.alunoId) throw new Error('Selecione o aluno.');
        const aluno = await getAlunoById(form.alunoId).catch(() => null);
        if (!aluno) throw new Error('Aluno não encontrado.');
        payload.alunoId = aluno.id;
      }

      await createInformativo(payload);

      setOpen(false);
      setForm({ titulo: '', conteudo: '', publico: 'ALL', cursoId: '', turmaId: '', alunoId: '' });
      await qc.invalidateQueries({ queryKey: ['informativos'] });
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Erro ao criar informativo');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este informativo?')) return;
    await deleteInformativo(id);
    await qc.invalidateQueries({ queryKey: ['informativos'] });
  }

  const data = query.data;
  const total = data?.total ?? 0;
  const perPage = data?.perPage ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const items = data?.data ?? [];

  function renderDestino(i: Informativo) {
    switch (i.publico) {
      case 'ALL':
        return 'Todos';
      case 'CURSO':
        return i.cursoId ? `Curso: ${cursosMap[i.cursoId] ?? i.cursoId}` : 'Curso';
      case 'TURMA':
        return i.turmaId ? `Turma: ${turmasMap[i.turmaId] ?? i.turmaId}` : 'Turma';
      case 'ALUNO':
        return i.alunoId ? `Aluno: ${alunosMap[i.alunoId] ?? i.alunoId}` : 'Aluno';
      default:
        return '-';
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-semibold">Informativos</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por título ou conteúdo…"
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
          />
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Novo informativo
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[color:var(--text-muted)]">
                <th className="py-2">Título</th>
                <th className="py-2">Destino</th>
                <th className="py-2">Criado em</th>
                <th className="py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i: Informativo) => (
                <tr key={i.id} className="border-t border-black/5">
                  <td className="py-3">
                    <div className="font-medium">{i.titulo}</div>
                    <div className="text-xs text-[color:var(--text-muted)] truncate max-w-[520px]">{i.conteudo}</div>
                  </td>
                  <td className="py-3">{renderDestino(i)}</td>
                  <td className="py-3">{new Date(i.createdAt).toLocaleString()}</td>
                  <td className="py-3">
                    <button className="btn btn-ghost text-red-600" title="Excluir" onClick={() => handleDelete(i.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!query.isFetching && items.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[color:var(--text-muted)]">
                    Nenhum informativo encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="text-xs text-[color:var(--text-muted)]">
            {query.isFetching ? 'Atualizando…' : `${items.length} / ${total} itens`}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Anterior
            </button>
            <div className="text-sm">{page} / {totalPages}</div>
            <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Próxima
            </button>
          </div>
        </div>
      </Card>

      {/* Modal de criação */}
      {open && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
          <div className="card w-full max-w-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Novo informativo</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <div className="label">Título</div>
                  <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
                </div>

                <div className="sm:col-span-2">
                  <div className="label">Mensagem</div>
                  <Textarea rows={4} value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} required />
                </div>

                <div className="sm:col-span-2">
                  <div className="label">Enviar para</div>
                  <select
                    className="input"
                    value={form.publico}
                    onChange={(e) => {
                      const publico = e.target.value as InformativoPublico;
                      setForm({
                        ...form,
                        publico,
                        cursoId: publico === 'CURSO' || publico === 'TURMA' ? form.cursoId : '',
                        turmaId: publico === 'TURMA' ? form.turmaId : '',
                        alunoId: publico === 'ALUNO' ? form.alunoId : '',
                      });
                    }}
                  >
                    <option value="ALL">Todos os alunos</option>
                    <option value="CURSO">Por curso</option>
                    <option value="TURMA">Por turma</option>
                    <option value="ALUNO">Aluno específico</option>
                  </select>
                </div>

                {form.publico === 'CURSO' && (
                  <div className="sm:col-span-2">
                    <div className="label">Curso</div>
                    <select
                      className="input"
                      value={form.cursoId}
                      onChange={(e) => setForm({ ...form, cursoId: e.target.value, turmaId: '' })}
                      required
                    >
                      <option value="" disabled>Selecione um curso</option>
                      {cursosQuery.data?.data?.map((c: Curso) => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                {form.publico === 'TURMA' && (
                  <>
                    <div>
                      <div className="label">Curso</div>
                      <select
                        className="input"
                        value={form.cursoId}
                        onChange={(e) => setForm({ ...form, cursoId: e.target.value, turmaId: '' })}
                        required
                      >
                        <option value="" disabled>Selecione um curso</option>
                        {cursosQuery.data?.data?.map((c: Curso) => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="label">Turma</div>
                      <select
                        className="input"
                        value={form.turmaId}
                        onChange={(e) => setForm({ ...form, turmaId: e.target.value })}
                        disabled={!form.cursoId || turmasQuery.isFetching}
                        required
                      >
                        <option value="" disabled>Selecione uma turma</option>
                        {(turmasQuery.data ?? []).map((t: Turma) => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {form.publico === 'ALUNO' && (
                  <div className="sm:col-span-2">
                    <div className="label">Aluno</div>
                    <select
                      className="input"
                      value={form.alunoId}
                      onChange={(e) => setForm({ ...form, alunoId: e.target.value })}
                      required
                    >
                      <option value="" disabled>Selecione um aluno</option>
                      {alunosQuery.data?.data?.map((a: Aluno) => (
                        <option key={a.id} value={a.id}>{a.nome}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {err && <p className="text-red-600 text-sm">{err}</p>}

              <div className="flex items-center justify-end gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                <Button disabled={creating}>{creating ? 'Salvando…' : 'Publicar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
