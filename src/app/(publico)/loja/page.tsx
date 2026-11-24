import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/site";
import { formatBRL } from "@/lib/format";
import { precoVigente } from "@/lib/preco";
import { AvisoConfig, PageTitle } from "@/components/page-title";
import { textoDeHtml } from "@/lib/html-apresentacao";
import { um } from "@/lib/relacao";

export default async function LojaPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div>
        <PageTitle title="Loja" />
        <AvisoConfig />
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("produto")
    .select("id, nome, slug, descricao, preco, preco_promocional, promocao_ate, materias:produto_materia(materia:materia_id(nome))")
    .eq("ativo", true)
    .order("ordem");

  const produtos = (data ?? []).map((item) => ({
    ...item,
    materias: (item.materias as { materia: { nome: string } | { nome: string }[] | null }[] | null)?.map((linha) => um(linha.materia)).filter((materia): materia is { nome: string } => Boolean(materia)) ?? [],
  }));

  return (
    <div>
      <PageTitle
        title="Loja"
        description="Cada produto pode liberar uma matéria ou um grupo de matérias."
      />
      {produtos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum produto publicado ainda.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {produtos.map((produto) => (
            <Link key={produto.id} href={`/loja/${produto.slug}`} className="rounded-xl border bg-card p-5 hover:border-primary">
              <p className="text-lg font-medium">{produto.nome}</p>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{textoDeHtml(produto.descricao)}</p>
              <p className="mt-3 text-sm">
                {produto.materias.length === 0
                  ? "Não libera matéria"
                  : produto.materias.length === 1
                    ? `Inclui ${produto.materias[0].nome}`
                    : `Inclui ${produto.materias.length} matérias`}
              </p>
              <p className="mt-1 font-semibold">
                {formatBRL(precoVigente(Number(produto.preco), produto.preco_promocional, produto.promocao_ate).atual)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
