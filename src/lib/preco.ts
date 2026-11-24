export function precoVigente(
  preco: number,
  promocional: number | string | null | undefined,
  ate: string | null | undefined
) {
  if (promocional == null || promocional === "") return { atual: Number(preco), de: null as number | null };
  const valor = Number(promocional);
  if (!Number.isFinite(valor) || valor < 0) return { atual: Number(preco), de: null };
  const limite = ate ? String(ate).slice(0, 10) : "";
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  if (limite && limite < hoje) return { atual: Number(preco), de: null };
  return { atual: valor, de: Number(preco) };
}
