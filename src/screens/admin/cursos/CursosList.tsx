/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listCursos, createCurso, deleteCurso } from '../../../services/cursos';
import type { Curso } from '../../../services/cursos'; // <- type-only import ✅
import { Button } from '../../../ui/Button';
import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { useDebounce } from '../../../utils/useDebounce';
import { Plus, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../../../ui/Delete';

export default function CursosList() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(q);

  const { data, isFetching, error } = useQuery({
    queryKey: ['cursos', { q: debounced, page }],
    queryFn: () => listCursos({ q: debounced || undefined, page, perPage: 10 }),
    staleTime: 1000 * 10,
  });

  // Usa o `error` para evitar o TS6133
  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-600">Erro ao carregar cursos.</p>
      </div>
    );
  }

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ nome: string; modality: 'ONLINE'|'PRESENCIAL'; duracaoHoras?: number | '' }>({
    nome: '',
    modality: 'ONLINE',
    duracaoHoras: '',
  });
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true); setErr(null);
    try {
      await createCurso({
        nome: form.nome.trim(),
        modality: form.modality,
        duracaoHoras: form.duracaoHoras === '' ? null : Number(form.duracaoHoras),
      });
      setOpen(false);
      setForm({ nome: '', modality: 'ONLINE', duracaoHoras: '' });
      await qc.invalidateQueries({ queryKey: ['cursos'] });
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Erro ao criar curso');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteCurso(id);
    await qc.invalidateQueries({ queryKey: ['cursos'] });
    setOpenModal(false);
  }

  const total = data?.total ?? 0;
  const perPage = data?.perPage ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-semibold">Cursos</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar por nome…"
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value); }}
          />
          <Button onClick={() => setOpen(true)}><Plus size={16}/> Novo curso</Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[color:var(--text-muted)]">
                <th className="py-2">Nome</th>
                <th className="py-2">Modalidade</th>
                <th className="py-2">Duração (h)</th>
                <th className="py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((c: Curso) => (
                <tr key={c.id} className="border-t border-black/5">
                  <td className="py-3">{c.nome}</td>
                  <td className="py-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
                      {c.modality}
                    </span>
                  </td>
                  <td className="py-3">{c.duracaoHoras ?? '—'}</td>
                  <td className="py-3">
                    <button
                      className="btn btn-ghost text-red-600"
                      title="Excluir"
                      onClick={() => setOpenModal(true)}
                    >
                      <Trash2 size={16}/>
                    </button>
                    <ConfirmModal
                      open={ openModal}
                      onConfirm= {() => handleDelete(c.id)}
                      onCancel={() => setOpenModal(false)}
                    />
                  </td>
                </tr>
              ))}
              {!isFetching && data?.data?.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-[color:var(--text-muted)]">Nenhum curso encontrado.</td></tr>
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
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >Anterior</button>
            <div className="text-sm">{page} / {totalPages}</div>
            <button
              className="btn btn-ghost"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >Próxima</button>
          </div>
        </div>
      </Card>

      {/* Modal de criação */}
      {open && (
        <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
          <div className="card w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Novo curso</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <div className="label">Nome</div>
                <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
              </div>
              <div>
                <div className="label">Modalidade</div>
                <select
                  className="input"
                  value={form.modality}
                  onChange={(e) => setForm({ ...form, modality: e.target.value as 'ONLINE'|'PRESENCIAL' })}
                >
                  <option value="ONLINE">ONLINE</option>
                  <option value="PRESENCIAL">PRESENCIAL</option>
                </select>
              </div>
              <div>
                <div className="label">Duração (horas) — opcional</div>
                <Input
                  type="number"
                  min={1}
                  value={form.duracaoHoras as any}
                  onChange={(e) => setForm({ ...form, duracaoHoras: e.target.value === '' ? '' : Number(e.target.value) })}
                />
              </div>

              {err && <p className="text-red-600 text-sm">{err}</p>}

              <div className="flex items-center justify-end gap-2">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                <Button disabled={creating}>{creating ? 'Salvando…' : 'Salvar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}    
    </div>
  );
}
