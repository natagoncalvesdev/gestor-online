import Link from "next/link";
import { formatBRL } from "@/lib/format";
import { precoVigente } from "@/lib/preco";
import { textoDeHtml } from "@/lib/html-apresentacao";
import type { ProdutoLoja } from "@/lib/loja-catalogo";
import { CapaProduto } from "@/components/loja/capa-produto";
import { urlImagemProduto } from "@/lib/produto-imagem";

function textoMaterias(materias: { nome: string }[]) {
  if (materias.length === 0) return "Produto físico";
  if (materias.length === 1) return `Inclui ${materias[0].nome}`;
  return `Inclui ${materias.length} matérias`;
}

export function GradeProdutosLoja({
  produtos,
  vazio,
}: {
  produtos: ProdutoLoja[];
  vazio?: string;
}) {
  if (produtos.length === 0) {
    return <p className="text-sm text-muted-foreground">{vazio ?? "Nenhum produto publicado ainda."}</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {produtos.map((produto) => {
        const capa = urlImagemProduto(produto.imagem_path);
        const preco = precoVigente(Number(produto.preco), produto.preco_promocional, produto.promocao_ate);

        return (
          <Link
            key={produto.id}
            href={`/loja/${produto.slug}`}
            className="overflow-hidden rounded-xl border bg-card hover:border-primary"
          >
            {capa ? <CapaProduto src={capa} proporcao="aspect-[4/3]" /> : null}
            <div className="p-5">
              <p className="text-lg font-medium">{produto.nome}</p>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{textoDeHtml(produto.descricao)}</p>
              <p className="mt-3 text-sm">{textoMaterias(produto.materias)}</p>
              <p className="mt-1 font-semibold">{formatBRL(preco.atual)}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}