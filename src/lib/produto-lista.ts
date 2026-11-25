export function rotuloEstoqueProduto(ativo: boolean, ehFisico: boolean) {
  if (!ativo) {
    return { texto: "Fora de estoque", className: "text-red-600" };
  }
  if (ehFisico) {
    return { texto: "Em estoque", className: "text-green-600" };
  }
  return { texto: "Em estoque", className: "text-green-600" };
}

export function formatDataPublicacaoProduto(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const data = date.toLocaleDateString("pt-BR");
  const hora = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${data} às ${hora}`;
}