import { textoDeHtml } from "@/lib/html-apresentacao";

export type ItemCarrinho = {
  produtoId: string;
  variacaoId: string | null;
  nome: string;
  preco: number;
  quantidade: number;
  imagemUrl?: string | null;
  descricaoResumo?: string;
};

export const CHAVE_CARRINHO = "gestor-online-carrinho";
export const EVENTO_CARRINHO = "gestor-online-carrinho-atualizado";

export function chaveItem(item: Pick<ItemCarrinho, "produtoId" | "variacaoId">) {
  return `${item.produtoId}:${item.variacaoId ?? "base"}`;
}

function normalizar(bruto: unknown): ItemCarrinho[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const linha = item as Partial<ItemCarrinho>;
      if (!linha.produtoId || !linha.nome || typeof linha.preco !== "number") return null;
      const quantidade =
        typeof linha.quantidade === "number" && linha.quantidade > 0 ? Math.floor(linha.quantidade) : 1;
      return {
        produtoId: linha.produtoId,
        variacaoId: linha.variacaoId ?? null,
        nome: linha.nome,
        preco: linha.preco,
        quantidade,
        imagemUrl: linha.imagemUrl ?? null,
        descricaoResumo: linha.descricaoResumo,
      } satisfies ItemCarrinho;
    })
    .filter((item) => item != null);
}

export function lerCarrinho(): ItemCarrinho[] {
  if (typeof window === "undefined") return [];
  try {
    return normalizar(JSON.parse(localStorage.getItem(CHAVE_CARRINHO) || "[]"));
  } catch {
    return [];
  }
}

export function gravarCarrinho(itens: ItemCarrinho[]) {
  localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(itens));
  window.dispatchEvent(new CustomEvent(EVENTO_CARRINHO));
}

export function totalUnidades(itens: ItemCarrinho[]) {
  return itens.reduce((soma, item) => soma + item.quantidade, 0);
}

export function subtotalCarrinho(itens: ItemCarrinho[]) {
  return itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0);
}

export function resumoDescricao(html: string, max = 140) {
  const texto = textoDeHtml(html);
  if (texto.length <= max) return texto;
  return `${texto.slice(0, max).trimEnd()}…`;
}

export function adicionarAoCarrinho(
  entrada: Omit<ItemCarrinho, "quantidade"> & { quantidade?: number }
): ItemCarrinho[] {
  const quantidade = entrada.quantidade ?? 1;
  const atual = lerCarrinho();
  const chave = chaveItem(entrada);
  const indice = atual.findIndex((item) => chaveItem(item) === chave);

  if (indice >= 0) {
    atual[indice] = {
      ...atual[indice],
      preco: entrada.preco,
      nome: entrada.nome,
      imagemUrl: entrada.imagemUrl ?? atual[indice].imagemUrl,
      descricaoResumo: entrada.descricaoResumo ?? atual[indice].descricaoResumo,
      quantidade: atual[indice].quantidade + quantidade,
    };
  } else {
    atual.push({ ...entrada, quantidade });
  }

  gravarCarrinho(atual);
  return atual;
}

export function itensParaCheckout(itens: ItemCarrinho[]) {
  return itens.flatMap((item) =>
    Array.from({ length: item.quantidade }, () => ({
      produtoId: item.produtoId,
      variacaoId: item.variacaoId,
    }))
  );
}