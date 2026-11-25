export function cepOnlyDigits(s: string): string {
  return s.replace(/\D/g, "").slice(0, 8);
}

export function formatCepDisplay(digits: string): string {
  const d = cepOnlyDigits(digits);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}