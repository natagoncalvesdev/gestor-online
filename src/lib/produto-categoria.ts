export type ProdutoCategoriaLinha = {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  pai_id: string | null;
  ordem: number;
  ativo: boolean;
  sistema?: boolean;
};

export type ProdutoCategoriaLista = ProdutoCategoriaLinha & {
  profundidade: number;
  contagem?: number;
};

export const SLUG_RAIZ_SECAO_LOJA = {
  teologia: "cursos-de-teologia",
  especializacoes: "especializacoes",
  livraria: "livraria",
} as const;

export type SecaoLoja = keyof typeof SLUG_RAIZ_SECAO_LOJA;

export function idsNaArvoreDeSlug(categorias: ProdutoCategoriaLinha[], slugRaiz: string): Set<string> {
  const porId = new Map(categorias.map((item) => [item.id, item]));
  const raiz = categorias.find((item) => item.slug === slugRaiz && item.pai_id === null);
  if (!raiz) return new Set();

  const ids = new Set<string>();
  function visitar(id: string) {
    ids.add(id);
    for (const filho of categorias) {
      if (filho.pai_id === id) visitar(filho.id);
    }
  }
  visitar(raiz.id);
  return ids;
}

export function profundidadeCategoria(categorias: ProdutoCategoriaLinha[], id: string): number {
  const porId = new Map(categorias.map((item) => [item.id, item]));
  let profundidade = 0;
  let atual = porId.get(id);
  while (atual?.pai_id) {
    profundidade += 1;
    atual = porId.get(atual.pai_id);
    if (profundidade > 32) break;
  }
  return profundidade;
}

export function ordenarCategoriasHierarquia(categorias: ProdutoCategoriaLinha[]): ProdutoCategoriaLista[] {
  const filhos = new Map<string | null, ProdutoCategoriaLinha[]>();
  for (const item of categorias) {
    const chave = item.pai_id;
    const lista = filhos.get(chave) ?? [];
    lista.push(item);
    filhos.set(chave, lista);
  }
  for (const lista of filhos.values()) {
    lista.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
  }

  const saida: ProdutoCategoriaLista[] = [];
  function percorrer(paiId: string | null, profundidade: number) {
    for (const item of filhos.get(paiId) ?? []) {
      saida.push({ ...item, profundidade });
      percorrer(item.id, profundidade + 1);
    }
  }
  percorrer(null, 0);
  return saida;
}

export function prefixoHierarquia(profundidade: number) {
  if (profundidade <= 0) return "";
  return `${"— ".repeat(profundidade)}`;
}

export function rotuloCategoriaComHierarquia(nome: string, profundidade: number) {
  return `${prefixoHierarquia(profundidade)}${nome}`;
}

/** Recuo à esquerda por nível (filhas/netas em relação ao pai). */
export function recuoHierarquiaCategoria(profundidade: number, passoRem = 1) {
  if (profundidade <= 0) return undefined;
  return { paddingInlineStart: `${0.75 + profundidade * passoRem}rem` } as const;
}

export function resumoCategoriasProduto(nomes: string[]) {
  if (nomes.length === 0) return "Sem categoria";
  if (nomes.length <= 2) return nomes.join(", ");
  return `${nomes.slice(0, 2).join(", ")} +${nomes.length - 2}`;
}

export type CategoriaProdutoExibicao = {
  id: string;
  nome: string;
  profundidade: number;
};

/** Só categorias marcadas no produto, em ordem hierárquica com nível para o recuo. */
export function categoriasVinculadasParaExibicao(
  vinculados: string[],
  categorias: ProdutoCategoriaLinha[],
): CategoriaProdutoExibicao[] {
  const marcadas = new Set(vinculados);
  return ordenarCategoriasHierarquia(categorias.filter((item) => marcadas.has(item.id))).map((item) => ({
    id: item.id,
    nome: item.nome,
    profundidade: item.profundidade,
  }));
}

export function produtoNaSecaoLoja(
  categoriaIdsDoProduto: string[],
  categorias: ProdutoCategoriaLinha[],
  secao: SecaoLoja,
): boolean {
  if (categoriaIdsDoProduto.length === 0) return false;
  const permitidos = idsNaArvoreDeSlug(categorias, SLUG_RAIZ_SECAO_LOJA[secao]);
  return categoriaIdsDoProduto.some((id) => permitidos.has(id));
}