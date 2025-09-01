/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMe, type MeResponse } from '../../services/me';
import { useAuth } from '../../auth/store';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';

function formatDateBR(value?: string | null) {
  if (!value) return '—';
  const iso = value.length === 10 ? `${value}T00:00:00` : value;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

export default function PerfilPage() {
  const storeProfile = useAuth((s) => s.profile);

  const { data } = useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: getMe,
    staleTime: 60_000,
  });

  const me = useMemo<MeResponse | null>(() => {
    if (data) return data;
    if (storeProfile) {
      return {
        id: storeProfile.id ?? '—',
        nome: storeProfile.nome ?? '—',
        email: (storeProfile as any).email ?? null,
        role: storeProfile.role,
        aluno: null,
      } as any;
    }
    return null;
  }, [data, storeProfile]);

  const nome = me?.aluno?.nome ?? me?.nome ?? '—';
  const email = me?.aluno?.email ?? me?.email ?? '—';
  const cpf = me?.aluno?.cpfAluno ?? '—';            // << CPF separado
  const matricula = me?.aluno?.matricula ?? '—';      // << Matrícula separada
  const nascimento = formatDateBR(me?.aluno?.dataNascimento);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Seu Perfil</h1>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="label">Nome</div>
            <Input value={nome} readOnly />
          </div>

          <div>
            <div className="label">E-mail</div>
            <Input value={email} readOnly />
          </div>

          <div>
            <div className="label">CPF</div>
            <Input value={cpf} readOnly />
          </div>

          <div>
            <div className="label">Matrícula</div>
            <Input value={matricula} readOnly />
          </div>

          <div>
            <div className="label">Data de Nascimento</div>
            <Input value={nascimento} readOnly />
          </div>

          <div>
            <div className="label">Papel</div>
            <Input value={me?.role?.toString()?.toUpperCase?.() ?? '—'} readOnly />
          </div>
        </div>
      </Card>
    </div>
  );
}
