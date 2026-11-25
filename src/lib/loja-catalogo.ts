import { createClient } from "@/lib/supabase/server";
import { um } from "@/lib/relacao";
import { produtoNaSecaoLoja, type ProdutoCategoriaLinha, type SecaoLoja } from "@/lib/produto-categoria";

export type ProdutoLoja = {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  preco: number;
  preco_promocional: number | null;
  promocao_ate: string | null;
  peso_gramas: number;
  comprimento_cm: number;
  largura_cm: number;
  altura_cm: number;
  imagem_path: string | null;
  categoriaIds: string[];
  materias: { nome: string }[];
};

function mapProdutos(
  data: {
    id: string;
    nome: string;
    slug: string;
    descricao: string;
    preco: number;
    preco_promocional: number | null;
    promocao_ate: string | null;
    peso_gramas: number;
    comprimento_cm: number;
    largura_cm: number;
    altura_cm: number;
    imagem_path: string | null;
    vinculos: { categoria_id: string }[] | null;
    materias: { materia: { nome: string } | { nome: string }[] | null }[] | null;
  }[],
): ProdutoLoja[] {
  return data.map((item) => ({
    id: item.id,
    nome: item.nome,
    slug: item.slug,
    descricao: item.descricao,
    preco: item.preco,
    preco_promocional: item.preco_promocional,
    promocao_ate: item.promocao_ate,
    peso_gramas: item.peso_gramas,
    comprimento_cm: item.comprimento_cm,
    largura_cm: item.largura_cm,
    altura_cm: item.altura_cm,
    imagem_path: item.imagem_path,
    categoriaIds: (item.vinculos ?? []).map((linha) => linha.categoria_id),
    materias:
      item.materias
        ?.map((linha) => um(linha.materia))
        .filter((materia): materia is { nome: string } => Boolean(materia)) ?? [],
  }));
}

const selectProduto =
  "id, nome, slug, descricao, preco, preco_promocional, promocao_ate, peso_gramas, comprimento_cm, largura_cm, altura_cm, imagem_path, vinculos:produto_categoria_produto(categoria_id), materias:produto_materia(materia:materia_id(nome))";

export async function listarProdutosLojaAtivos(): Promise<ProdutoLoja[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("produto")
    .select(selectProduto)
    .eq("ativo", true)
    .order("ordem");
  return mapProdutos(data ?? []);
}

export async function listarCategoriasAtivas(): Promise<ProdutoCategoriaLinha[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("produto_categoria")
    .select("id, nome, slug, descricao, pai_id, ordem, ativo")
    .order("ordem");
  return (data ?? []) as ProdutoCategoriaLinha[];
}

export function filtrarPorSecao(produtos: ProdutoLoja[], categorias: ProdutoCategoriaLinha[], secao: SecaoLoja) {
  return produtos.filter((produto) => produtoNaSecaoLoja(produto.categoriaIds, categorias, secao));
}