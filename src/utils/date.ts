// src/utils/date.ts
export function maskDMY(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function toISOFromDMY(dmy: string): string | null {
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

export function toDMYFromISO(iso?: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('T')[0].split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}
