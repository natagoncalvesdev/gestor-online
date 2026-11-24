import { createClient } from "@/lib/supabase/server";
import { um } from "@/lib/relacao";

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
    materias: { materia: { nome: string } | { nome: string }[] | null }[] | null;
  }[],
): ProdutoLoja[] {
  return data.map((item) => ({
    ...item,
    materias:
      item.materias
        ?.map((linha) => um(linha.materia))
        .filter((materia): materia is { nome: string } => Boolean(materia)) ?? [],
  }));
}

const selectProduto =
  "id, nome, slug, descricao, preco, preco_promocional, promocao_ate, peso_gramas, comprimento_cm, largura_cm, altura_cm, imagem_path, materias:produto_materia(materia:materia_id(nome))";

export async function listarProdutosLojaAtivos(): Promise<ProdutoLoja[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("produto")
    .select(selectProduto)
    .eq("ativo", true)
    .order("ordem");
  return mapProdutos(data ?? []);
}

export function produtoEhLivraria(produto: ProdutoLoja) {
  return (
    produto.peso_gramas > 0 ||
    produto.comprimento_cm > 0 ||
    produto.largura_cm > 0 ||
    produto.altura_cm > 0
  );
}

export function produtoEhEspecializacao(produto: ProdutoLoja) {
  return /especial/i.test(produto.nome) || /especial/i.test(produto.slug);
}

export function produtoEhTeologia(produto: ProdutoLoja) {
  return produto.materias.length > 0 && !produtoEhEspecializacao(produto);
}

export function filtrarPorSecao(produtos: ProdutoLoja[], secao: "teologia" | "especializacoes" | "livraria") {
  if (secao === "livraria") return produtos.filter(produtoEhLivraria);
  if (secao === "especializacoes") return produtos.filter(produtoEhEspecializacao);
  return produtos.filter(produtoEhTeologia);
}