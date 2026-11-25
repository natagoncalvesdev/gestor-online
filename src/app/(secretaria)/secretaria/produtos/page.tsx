import Link from "next/link";
import { TabelaProdutosSecretaria } from "@/components/secretaria/tabela-produtos-secretaria";
import { Card, CardContent } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import { precoVigente } from "@/lib/preco";
import { formatDataPublicacaoProduto, rotuloEstoqueProduto } from "@/lib/produto-lista";
import { urlImagemProduto } from "@/lib/produto-imagem";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";
import { um } from "@/lib/relacao";
import { categoriasVinculadasParaExibicao, type ProdutoCategoriaLinha } from "@/lib/produto-categoria";

export default async function ProdutosPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data }, { data: todasCategorias }] = await Promise.all([
    supabase
      .from("produto")
      .select(
        "id, nome, slug, imagem_path, preco, preco_promocional, promocao_ate, peso_gramas, comprimento_cm, largura_cm, altura_cm, ativo, ordem, data_criacao, vinculos:produto_categoria_produto(categoria:produto_categoria(id, nome))",
      )
      .order("ordem"),
    supabase
      .from("produto_categoria")
      .select("id, nome, slug, descricao, pai_id, ordem, ativo")
      .order("ordem"),
  ]);

  const arvore = (todasCategorias ?? []) as ProdutoCategoriaLinha[];

  const linhas = (data ?? []).map((produto) => {
    const preco = precoVigente(Number(produto.preco), produto.preco_promocional, produto.promocao_ate);
    const ehFisico =
      (produto.peso_gramas ?? 0) > 0 || (produto.comprimento_cm ?? 0) > 0 || (produto.largura_cm ?? 0) > 0 || (produto.altura_cm ?? 0) > 0;
    const estoque = rotuloEstoqueProduto(Boolean(produto.ativo), ehFisico);
    const vinculados =
      (produto.vinculos as { categoria: { id: string; nome: string } | { id: string; nome: string }[] | null }[] | null)
        ?.map((linha) => um(linha.categoria)?.id)
        .filter((id): id is string => Boolean(id)) ?? [];
    const categorias = categoriasVinculadasParaExibicao(vinculados, arvore);

    return {
      id: produto.id,
      nome: produto.nome,
      slug: produto.slug,
      imagemUrl: urlImagemProduto(produto.imagem_path),
      preco: formatBRL(preco.atual),
      precoDe: preco.de != null ? formatBRL(preco.de) : null,
      estoqueTexto: estoque.texto,
      estoqueClassName: estoque.className,
      categorias,
      ativo: produto.ativo,
      dataPublicacao: formatDataPublicacaoProduto(produto.data_criacao),
    };
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Todos os produtos</h1>
          <p className="text-sm text-muted-foreground">Lista no estilo da loja WooCommerce.</p>
        </div>
        <Link
          href="/secretaria/produtos/novo"
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Novo produto
        </Link>
      </div>
      <Card className="overflow-hidden border-slate-200">
        <CardContent className="px-0">
          {linhas.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum produto cadastrado.</p>
          ) : (
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col className="w-10" />
                <col className="w-10" />
                <col className="w-[22%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[9%]" />
                <col className="w-[22%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
              </colgroup>
              <TabelaProdutosSecretaria itens={linhas} />
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}