import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/site";
import { formatBRL } from "@/lib/format";
import { AvisoConfig, PageTitle } from "@/components/page-title";
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
    .select("id, nome, slug, descricao, preco, curso:curso_id(nome)")
    .eq("ativo", true)
    .order("nome");

  const produtos = (data ?? []).map((item) => ({
    ...item,
    curso: um(item.curso as { nome: string } | { nome: string }[] | null),
  }));

  return (
    <div>
      <PageTitle
        title="Loja"
        description="Cursos com aulas e prova, e também produtos que não liberam curso."
      />
      {produtos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum produto publicado ainda.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {produtos.map((produto) => (
            <Link key={produto.id} href={`/loja/${produto.slug}`} className="rounded-xl border bg-card p-5 hover:border-primary">
              <p className="text-lg font-medium">{produto.nome}</p>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{produto.descricao}</p>
              <p className="mt-3 text-sm">{produto.curso?.nome ?? "Sem curso vinculado"}</p>
              <p className="mt-1 font-semibold">{formatBRL(produto.preco)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
