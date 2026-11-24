export function um<T>(valor: T | T[] | null | undefined): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

export function lista<T>(valor: T[] | null | undefined): T[] {
  return valor ?? [];
}
