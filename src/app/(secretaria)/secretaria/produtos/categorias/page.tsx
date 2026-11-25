import Link from "next/link";
import { CategoriasProdutoOrdem } from "@/components/secretaria/categorias-produto-ordem";
import { Card, CardContent } from "@/components/ui/card";
import { ordenarCategoriasHierarquia, type ProdutoCategoriaLinha } from "@/lib/produto-categoria";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";

function contagemPorCategoria(vinculos: { categoria_id: string }[]) {
  const mapa = new Map<string, number>();
  for (const linha of vinculos) {
    mapa.set(linha.categoria_id, (mapa.get(linha.categoria_id) ?? 0) + 1);
  }
  return mapa;
}

export default async function CategoriasProdutoPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: categorias }, { data: vinculos }] = await Promise.all([
    supabase
      .from("produto_categoria")
      .select("id, nome, slug, descricao, pai_id, ordem, ativo, sistema")
      .order("ordem"),
    supabase.from("produto_categoria_produto").select("categoria_id"),
  ]);

  const contagem = contagemPorCategoria(vinculos ?? []);
  const hierarquia = ordenarCategoriasHierarquia((categorias ?? []) as ProdutoCategoriaLinha[]);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorias de produto</h1>
          <p className="text-sm text-muted-foreground">Hierarquia no estilo WooCommerce, com subcategorias e contagem de produtos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/secretaria/produtos" className="inline-flex h-9 items-center rounded-md border bg-white px-3 text-sm font-medium hover:bg-secondary">
            Voltar aos produtos
          </Link>
          <Link
            href="/secretaria/produtos/categorias/nova"
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Nova categoria
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="px-0">
          {hierarquia.length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="w-10 px-4 py-2 font-medium" />
                    <th className="min-w-[240px] px-4 py-2 font-medium">Nome</th>
                    <th className="px-4 py-2 font-medium">Descrição</th>
                    <th className="px-4 py-2 font-medium">Slug</th>
                    <th className="px-4 py-2 font-medium">Contagem</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <CategoriasProdutoOrdem
                    itens={hierarquia.map((item) => ({
                      id: item.id,
                      nome: item.nome,
                      slug: item.slug,
                      descricao: item.descricao,
                      pai_id: item.pai_id,
                      profundidade: item.profundidade,
                      contagem: contagem.get(item.id) ?? 0,
                      ativo: item.ativo,
                      sistema: item.sistema ?? false,
                    }))}
                  />
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}