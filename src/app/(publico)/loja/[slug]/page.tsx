import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComprarBox } from "@/components/loja/comprar-box";
import { um, lista } from "@/lib/relacao";

export default async function ProdutoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("produto")
    .select("id, nome, descricao, preco, curso:curso_id(nome), variacoes:produto_variacao(id, nome, preco, ordem, ativo)")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle();

  if (!data) notFound();

  const curso = um(data.curso as { nome: string } | { nome: string }[] | null);
  const variacoes = lista(data.variacoes as { id: string; nome: string; preco: number; ordem: number; ativo: boolean }[] | null)
    .filter((item) => item.ativo)
    .sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <article>
        <h1 className="text-3xl font-semibold">{data.nome}</h1>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{data.descricao}</p>
      </article>
      <ComprarBox
        produtoId={data.id}
        nome={data.nome}
        preco={Number(data.preco)}
        cursoNome={curso?.nome ?? null}
        variacoes={variacoes.map((item) => ({ id: item.id, nome: item.nome, preco: Number(item.preco) }))}
      />
    </div>
  );
}
