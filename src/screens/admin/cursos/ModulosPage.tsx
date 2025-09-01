/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { Button } from '../../../ui/Button';
import {
  listModulos,
  createModulo,
  updateModulo,
  deleteModulo,
  type Modulo,
} from '../../../services/modulos';
import { listCursos } from '../../../services/cursos';

type Curso = { id: string; nome: string };

export default function ModulosCursoPage() {
  const { cursoId: cursoIdParam = '' } = useParams();
  const [cursoIdState, setCursoIdState] = useState<string>('');
  const activeCursoId = useMemo(
    () => (cursoIdParam || cursoIdState || ''),
    [cursoIdParam, cursoIdState]
  );

  const qc = useQueryClient();

  // cursos para o select
  const { data: cursos = [], isLoading: isLoadingCursos, error: cursosErr } = useQuery<Curso[]>({
    queryKey: ['cursos', 'all'],
    queryFn: async () => {
      const res: any = await listCursos();
      return Array.isArray(res) ? res : (res?.data ?? []);
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // módulos do curso
  const { data: modulos = [], isFetching } = useQuery<Modulo[]>({
    queryKey: ['modulos', activeCursoId],
    queryFn: async () => listModulos(activeCursoId),
    enabled: !!activeCursoId,
    staleTime: 1000 * 15,
  });

  const [form, setForm] = useState<{ nome: string; ordem: string }>({ nome: '', ordem: '' });
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const canCreate =
    !!activeCursoId &&
    form.nome.trim().length > 0 &&
    (form.ordem === '' || Number(form.ordem) > 0);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCursoId) return;
    setCreating(true);
    setErr(null);
    try {
      const payload: { nome: string; ordem?: number | null } = { nome: form.nome.trim() };
      if (form.ordem !== '') {
        const n = Number(form.ordem);
        if (Number.isFinite(n) && n > 0) payload.ordem = Math.trunc(n);
      }
      await createModulo(activeCursoId, payload);
      setForm({ nome: '', ordem: '' });
      await qc.invalidateQueries({ queryKey: ['modulos', activeCursoId] });
    } catch (e: any) {
      const issues = e?.response?.data?.issues;
      const zodMsg = Array.isArray(issues)
        ? issues.map((i: any) => `${i.path?.join('.')}: ${i.message}`).join(' | ')
        : (issues && typeof issues === 'object')
          ? JSON.stringify(issues)
          : null;
      setErr(zodMsg || e?.response?.data?.message || e?.message || 'Erro ao criar módulo');
      console.error(e?.response?.data ?? e);
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(m: Modulo, patch: Partial<Modulo>) {
    setErr(null);
    try {
      const payload: { nome?: string; ordem?: number | null } = {};
      if (typeof patch.nome === 'string') payload.nome = patch.nome.trim();
      if (typeof patch.ordem !== 'undefined') {
        const n = Number(patch.ordem);
        payload.ordem = Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
      }
      await updateModulo(m.id, payload);
      await qc.invalidateQueries({ queryKey: ['modulos', activeCursoId] });
    } catch (e: any) {
      const issues = e?.response?.data?.issues;
      const zodMsg = Array.isArray(issues)
        ? issues.map((i: any) => `${i.path?.join('.')}: ${i.message}`).join(' | ')
        : (issues && typeof issues === 'object')
          ? JSON.stringify(issues)
          : null;
      setErr(zodMsg || e?.response?.data?.message || e?.message || 'Erro ao atualizar módulo');
      console.error(e?.response?.data ?? e);
    }
  }

  async function handleDelete(id: string) {
    setErr(null);
    try {
      await deleteModulo(id);
      await qc.invalidateQueries({ queryKey: ['modulos', activeCursoId] });
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'Erro ao excluir módulo');
    }
  }

  return (
    <div className="space-y-4">
      {/* Header + seletor de curso */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Módulos por curso</h1>

        <div className="flex items-center gap-2">
          <select
            className="border rounded-lg px-3 py-2 min-w-[260px]"
            value={activeCursoId}
            onChange={(e) => setCursoIdState(e.target.value)}
          >
            <option value="">
              {isLoadingCursos ? 'Carregando cursos…' : 'Selecione um curso'}
            </option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          {cursosErr && <span className="text-red-600 text-sm">Falha ao carregar cursos</span>}
        </div>
      </div>

      <Card>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <div className="label">Nome do módulo *</div>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
              disabled={!activeCursoId}
            />
          </div>
          <div>
            <div className="label">Ordem (opcional)</div>
            <Input
              type="number"
              min={1}
              step={1}
              value={form.ordem}
              onChange={(e) => setForm({ ...form, ordem: e.target.value })}
              placeholder="1"
              disabled={!activeCursoId}
            />
          </div>
          {err && <p className="text-red-600 text-sm sm:col-span-3">{err}</p>}
          <div className="sm:col-span-3 flex justify-end">
            <Button disabled={!canCreate || creating}>
              {creating ? 'Salvando…' : 'Criar módulo'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Módulos do curso</h2>
          <div className="text-sm text-[color:var(--text-muted)]">
            {!activeCursoId ? 'Escolha um curso' : (isFetching ? 'Atualizando…' : `${modulos.length} itens`)}
          </div>
        </div>

        <div className="overflow-x-auto mt-3">
          {!activeCursoId ? (
            <div className="py-6 text-center text-[color:var(--text-muted)]">
              Selecione um curso para listar os módulos.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[color:var(--text-muted)]">
                  <th className="py-2">Ordem</th>
                  <th className="py-2">Nome</th>
                  <th className="py-2 w-24" />
                </tr>
              </thead>
              <tbody>
                {modulos.map((m) => (
                  <tr key={m.id} className="border-t border-black/5">
                    <td className="py-2">
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={m.ordem ?? ''}
                        onChange={(e) =>
                          handleUpdate(m, { ordem: e.target.value === '' ? null : Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="py-2">
                      <Input value={m.nome} onChange={(e) => handleUpdate(m, { nome: e.target.value })} />
                    </td>
                    <td className="py-2">
                      <button className="btn btn-ghost text-red-600" onClick={() => handleDelete(m.id)} title="Excluir">
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
                {modulos.length === 0 && !isFetching && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-[color:var(--text-muted)]">
                      Nenhum módulo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
