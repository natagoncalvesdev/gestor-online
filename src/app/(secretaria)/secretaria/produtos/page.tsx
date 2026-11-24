import Link from "next/link";
import { ProdutosOrdem } from "@/components/secretaria/produtos-ordem";
import { Card, CardContent } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import { rotuloCategoria } from "@/lib/loja-catalogo";
import { precoVigente } from "@/lib/preco";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";

export default async function ProdutosPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("produto")
    .select("id, nome, categoria, preco, preco_promocional, promocao_ate, peso_gramas, comprimento_cm, largura_cm, altura_cm, ativo, ordem, materias:produto_materia(materia_id)")
    .order("ordem");

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
        <Link href="/secretaria/produtos/novo" className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Novo produto
        </Link>
      </div>
      <Card>
        <CardContent className="px-0">
          {(data ?? []).length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground">Nenhum produto cadastrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Ordem</th>
                    <th className="px-4 py-2 font-medium">Nome</th>
                    <th className="px-4 py-2 font-medium">Categoria</th>
                    <th className="px-4 py-2 font-medium">Preço</th>
                    <th className="px-4 py-2 font-medium">Peso</th>
                    <th className="px-4 py-2 font-medium">Medidas</th>
                    <th className="px-4 py-2 font-medium">Matérias</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <ProdutosOrdem
                    itens={(data ?? []).map((produto) => {
                      const preco = precoVigente(Number(produto.preco), produto.preco_promocional, produto.promocao_ate);
                      const materias = (produto.materias as { materia_id: string }[] | null) ?? [];
                      return {
                        id: produto.id,
                        nome: produto.nome,
                        categoria: rotuloCategoria(produto.categoria),
                        preco: formatBRL(preco.atual),
                        precoDe: preco.de != null ? formatBRL(preco.de) : null,
                        peso: `${produto.peso_gramas ?? 0} g`,
                        medidas:
                          produto.comprimento_cm || produto.largura_cm || produto.altura_cm
                            ? `${produto.comprimento_cm}×${produto.largura_cm}×${produto.altura_cm} cm`
                            : "—",
                        materias: materias.length,
                        ativo: produto.ativo,
                      };
                    })}
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
