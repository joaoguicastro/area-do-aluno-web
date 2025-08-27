/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from './Button';

type ConfirmModalProps = {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (id: string) => void;
  onCancel: () => void;
  loading?: boolean;
};

export function ConfirmModal({
  open,
  title = 'Confirmação',
  message = 'Tem certeza que deseja continuar?',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 grid place-items-center z-50">
      <div className="card w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-[color:var(--text-muted)]">{message}</p>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <Button onClick={() => onConfirm('')}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
