export function cpfOnlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export function formatCpfDisplay(digits: string): string {
  const d = cpfOnlyDigits(digits).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function cpfVerifierDigit(digits: string, weightsLength: 9 | 10): number {
  const startWeight = weightsLength + 1;
  let sum = 0;
  for (let i = 0; i < weightsLength; i++) {
    sum += Number(digits[i]) * (startWeight - i);
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCpf(digits: string): boolean {
  if (!/^\d{11}$/.test(digits)) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  const d1 = cpfVerifierDigit(digits, 9);
  if (d1 !== Number(digits[9])) return false;
  const d2 = cpfVerifierDigit(digits, 10);
  return d2 === Number(digits[10]);
}
