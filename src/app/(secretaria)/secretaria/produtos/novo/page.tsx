import { FormularioNovoProduto } from "@/components/secretaria/formulario-novo-produto";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";
import type { ProdutoCategoriaLinha } from "@/lib/produto-categoria";

export default async function NovoProdutoPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("produto_categoria")
    .select("id, nome, slug, descricao, pai_id, ordem, ativo, sistema")
    .eq("ativo", true)
    .order("ordem");
  const categorias = (data ?? []) as ProdutoCategoriaLinha[];
  const padrao = categorias.find((item) => item.slug === "cursos-de-teologia")?.id;
  return <FormularioNovoProduto categorias={categorias} categoriasPadrao={padrao ? [padrao] : []} />;
}
