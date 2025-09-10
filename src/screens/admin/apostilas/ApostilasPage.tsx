/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Card } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { Button } from '../../../ui/Button';

import {
  listApostilas,
  createApostila,
  deleteApostila,
  getApostilaById,
  type Apostila,
} from '../../../services/apostila';
import { listCursos, type Curso } from '../../../services/cursos';
import { uploadFile } from '../../../services/uploads';

function fmtDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ApostilasPorCursoPage() {
  const { cursoId: cursoIdParam = '' } = useParams();
  const [cursoIdState, setCursoIdState] = useState<string>('');

  const activeCursoId = useMemo(
    () => (cursoIdParam || cursoIdState || ''),
    [cursoIdParam, cursoIdState]
  );

  const qc = useQueryClient();

  // Cursos para o select
  const {
    data: cursos = [],
    isLoading: isLoadingCursos,
    error: cursosErr,
  } = useQuery<Curso[]>({
    queryKey: ['cursos', 'all'],
    queryFn: async () => {
      const res: any = await listCursos();
      return Array.isArray(res) ? res : (res?.data ?? []);
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Lista de apostilas do curso
  const {
    data: apostilasResp,
    isFetching: isFetchingApostilas,
    isLoading: isLoadingApostilas,
  } = useQuery<{ data: Apostila[]; total: number; page: number; perPage: number }>({
    queryKey: ['apostilas', { cursoId: activeCursoId }],
    queryFn: async () =>
      listApostilas({ cursoId: activeCursoId, page: 1, perPage: 50 }),
    enabled: !!activeCursoId,
    staleTime: 15 * 1000,
  });

  const apostilas = apostilasResp?.data ?? [];

  // Formulário de criação
  const [form, setForm] = useState<{ titulo: string; urlPdf: string }>({
    titulo: '',
    urlPdf: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const hasValidUrl = /^https?:\/\//i.test(form.urlPdf.trim());
  const canCreate =
    !!activeCursoId && form.titulo.trim().length > 0 && (file !== null || hasValidUrl);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCursoId) return;
    setErr(null);
    setCreating(true);

    try {
      // Se o usuário selecionou um arquivo, faz upload e obtém a URL
      let finalUrl = form.urlPdf.trim();
      if (file) {
        setUploading(true);
        const { url } = await uploadFile(file, { folder: 'apostilas' });
        finalUrl = url;
      }

      // Cria a apostila com a URL (do upload ou digitada)
      await createApostila({
        cursoId: activeCursoId,
        titulo: form.titulo.trim(),
        urlPdf: finalUrl,
      });

      // Limpa estado e recarrega lista
      setForm({ titulo: '', urlPdf: '' });
      setFile(null);
      await qc.invalidateQueries({ queryKey: ['apostilas', { cursoId: activeCursoId }] });
    } catch (e: any) {
      const issues = e?.response?.data?.issues;
      const zodMsg = Array.isArray(issues)
        ? issues.map((i: any) => `${i.path?.join('.')}: ${i.message}`).join(' | ')
        : (issues && typeof issues === 'object')
          ? JSON.stringify(issues)
          : null;
      setErr(zodMsg || e?.response?.data?.message || e?.message || 'Erro ao criar apostila');
      console.error(e?.response?.data ?? e);
    } finally {
      setUploading(false);
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setErr(null);
    try {
      await deleteApostila(id);
      await qc.invalidateQueries({ queryKey: ['apostilas', { cursoId: activeCursoId }] });
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'Erro ao excluir apostila');
    }
  }

  async function handlePreview(id: string) {
    try {
      const a = await getApostilaById(id);
      if (a?.urlPdf) {
        window.open(a.urlPdf, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header + seletor de curso */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Apostilas por curso</h1>

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

      {/* Formulário de criação */}
      <Card>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <div className="label">Título *</div>
            <Input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              required
              disabled={!activeCursoId || creating || uploading}
              placeholder="Ex.: Apostila de Informática"
            />
          </div>
          {/* Input de arquivo */}
          <div className="sm:col-span-3">
            <div className="label">Arquivo PDF (opcional)</div>
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={!activeCursoId || creating || uploading}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full border rounded-lg p-2"
            />
            {file && (
              <div className="mt-1 text-sm text-[color:var(--text-muted)]">
                Selecionado: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          {err && <p className="text-red-600 text-sm sm:col-span-3">{err}</p>}

          <div className="sm:col-span-3 flex justify-end">
            {/* Se o seu Button NÃO repassar "type", use o <button> nativo (abaixo) */}
            <Button
              type="submit"
              disabled={!canCreate || creating || uploading}
            >
              {uploading ? 'Enviando arquivo…' : creating ? 'Salvando…' : 'Criar apostila'}
            </Button>

            {/*
            <button
              type="submit"
              disabled={!canCreate || creating || uploading}
              className="btn"
            >
              {uploading ? 'Enviando arquivo…' : creating ? 'Salvando…' : 'Criar apostila'}
            </button>
            */}
          </div>

          {/* (Opcional) Ajuda de validação */}
          {!canCreate && (
            <div className="sm:col-span-3 text-xs text-[color:var(--text-muted)] mt-1 text-right">
              Preencha o título, selecione um curso e envie um arquivo PDF ou informe uma URL válida.
            </div>
          )}
        </form>
      </Card>

      {/* Lista de apostilas */}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Apostilas do curso</h2>
          <div className="text-sm text-[color:var(--text-muted)]">
            {!activeCursoId
              ? 'Escolha um curso'
              : isLoadingApostilas
                ? 'Carregando…'
                : isFetchingApostilas
                  ? 'Atualizando…'
                  : `${apostilas.length} itens`}
          </div>
        </div>

        <div className="overflow-x-auto mt-3">
          {!activeCursoId ? (
            <div className="py-6 text-center text-[color:var(--text-muted)]">
              Selecione um curso para listar as apostilas.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[color:var(--text-muted)]">
                  <th className="py-2">Título</th>
                  <th className="py-2">PDF</th>
                  <th className="py-2">Criada em</th>
                  <th className="py-2 w-40"></th>
                </tr>
              </thead>
              <tbody>
                {apostilas.map((a) => (
                  <tr key={a.id} className="border-t border-black/5">
                    <td className="py-2">{a.titulo}</td>
                    <td className="py-2">
                      <a
                        href={a.urlPdf}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                        title={a.urlPdf}
                      >
                        Abrir PDF
                      </a>
                    </td>
                    <td className="py-2">{fmtDate(a.createdAt)}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => handlePreview(a.id)}
                          title="Visualizar"
                        >
                          Visualizar
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost text-red-600"
                          onClick={() => handleDelete(a.id)}
                          title="Excluir"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {apostilas.length === 0 && !isFetchingApostilas && !isLoadingApostilas && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[color:var(--text-muted)]">
                      Nenhuma apostila.
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
