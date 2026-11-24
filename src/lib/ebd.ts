export function idYoutube(url: string) {
  const texto = url.trim();
  const curto = texto.match(/youtu\.be\/([\w-]{11})/);
  if (curto) return curto[1];
  const embed = texto.match(/embed\/([\w-]{11})/);
  if (embed) return embed[1];
  const comum = texto.match(/[?&]v=([\w-]{11})/);
  return comum?.[1] ?? null;
}

export function horarioBrasilia(valor: string) {
  const texto = valor.trim();
  if (!texto) return null;
  const data = new Date(`${texto}:00-03:00`);
  if (Number.isNaN(data.getTime())) return null;
  return data.toISOString();
}

export function campoDataHora(iso: string | null) {
  if (!iso) return "";
  const partes = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return partes.replace(" ", "T");
}

export function licaoLiberada(liberaEm: string | null, agora = new Date()) {
  if (!liberaEm) return false;
  return new Date(liberaEm).getTime() <= agora.getTime();
}

export function textoLiberacao(liberaEm: string | null) {
  if (!liberaEm) return "Data ainda não definida";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(liberaEm));
}
