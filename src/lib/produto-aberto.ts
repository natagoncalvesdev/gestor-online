import { um } from "@/lib/relacao";

export type ProdutoAberto = {
  nome: string;
  gratuita: boolean;
};

export async function produtoAbertoDaMateria(
  supabase: { from: (tabela: string) => any },
  materiaId: string,
): Promise<ProdutoAberto | null> {
  const { data } = await supabase
    .from("produto_materia")
    .select("produto:produto_id(nome, gratuita, para_todos, ativo)")
    .eq("materia_id", materiaId);
  const linhas = (data ?? []) as { produto: { nome: string; gratuita: boolean; para_todos: boolean; ativo: boolean } | { nome: string; gratuita: boolean; para_todos: boolean; ativo: boolean }[] | null }[];
  for (const linha of linhas) {
    const produto = um(linha.produto);
    if (produto?.para_todos && produto.ativo) return { nome: produto.nome, gratuita: produto.gratuita };
  }
  return null;
}
