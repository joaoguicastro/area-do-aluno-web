// utils/maskPhoneBR.ts
export function maskPhoneBR(input: string): string {
  // só dígitos
  let digits = input.replace(/\D/g, '');

  // remove +55 se vier com DDI
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }

  // limita a 11 dígitos (2 DDD + 9 número)
  if (digits.length > 11) digits = digits.slice(0, 11);

  const len = digits.length;

  if (len === 0) return '';

  // monta DDD
  if (len < 3) {
    // até 2 dígitos ainda formando o DDD
    return `(${digits}`;
  }

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  const isMobile = len > 10; // 9 dígitos no número => celular

  const first = rest.slice(0, isMobile ? 5 : 4);
  const second = rest.slice(isMobile ? 5 : 4);

  let out = `(${ddd}) ${first}`;
  if (second) out += `-${second}`;

  return out;
}
