export function formatBRL(value: number | string): string {
  const n = typeof value === "number" ? value : Number(value);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const iso = value.length === 10 ? `${value}T12:00:00` : value;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR");
}
