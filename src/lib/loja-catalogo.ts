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
  categoria: "teologia" | "especializacao" | "livraria";
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
    categoria: "teologia" | "especializacao" | "livraria";
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
  "id, nome, slug, descricao, preco, preco_promocional, promocao_ate, peso_gramas, comprimento_cm, largura_cm, altura_cm, imagem_path, categoria, materias:produto_materia(materia:materia_id(nome))";

export async function listarProdutosLojaAtivos(): Promise<ProdutoLoja[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("produto")
    .select(selectProduto)
    .eq("ativo", true)
    .order("ordem");
  return mapProdutos(data ?? []);
}

export const CATEGORIAS_PRODUTO = [
  { valor: "teologia", rotulo: "Curso de teologia" },
  { valor: "especializacao", rotulo: "Curso de especialização" },
  { valor: "livraria", rotulo: "Livraria" },
] as const;

export function rotuloCategoria(categoria: string) {
  return CATEGORIAS_PRODUTO.find((item) => item.valor === categoria)?.rotulo ?? "Curso de teologia";
}

export function filtrarPorSecao(produtos: ProdutoLoja[], secao: "teologia" | "especializacoes" | "livraria") {
  if (secao === "livraria") return produtos.filter((produto) => produto.categoria === "livraria");
  if (secao === "especializacoes") return produtos.filter((produto) => produto.categoria === "especializacao");
  return produtos.filter((produto) => produto.categoria === "teologia");
}