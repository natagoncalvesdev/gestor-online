import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComprarBox } from "@/components/loja/comprar-box";
import { um, lista } from "@/lib/relacao";
import { precoVigente } from "@/lib/preco";

export default async function ProdutoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("produto")
    .select("id, nome, descricao, preco, preco_promocional, promocao_ate, materias:produto_materia(ordem, materia:materia_id(nome)), variacoes:produto_variacao(id, nome, preco, ordem, ativo)")
    .eq("slug", slug)
    .eq("ativo", true)
    .maybeSingle();

  if (!data) notFound();

  const materias = lista(data.materias as { ordem: number; materia: { nome: string } | { nome: string }[] | null }[] | null)
    .map((linha) => ({ ordem: linha.ordem, materia: um(linha.materia) }))
    .filter((linha) => linha.materia)
    .sort((a, b) => a.ordem - b.ordem);
  const inclui =
    materias.length === 0
      ? "Este produto não libera matéria."
      : materias.length === 1
        ? `Inclui ${materias[0].materia!.nome}.`
        : `Inclui ${materias.map((linha) => linha.materia!.nome).join(", ")}.`;
  const preco = precoVigente(Number(data.preco), data.preco_promocional, data.promocao_ate);
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
        preco={preco.atual}
        precoDe={preco.de}
        inclui={inclui}
        variacoes={variacoes.map((item) => ({ id: item.id, nome: item.nome, preco: Number(item.preco) }))}
      />
    </div>
  );
}
