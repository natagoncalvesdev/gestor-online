import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/site";
import { formatBRL } from "@/lib/format";
import { precoVigente } from "@/lib/preco";
import { AvisoConfig } from "@/components/page-title";
import { um } from "@/lib/relacao";

function textoMaterias(materias: { nome: string }[]) {
  if (materias.length === 0) return "Não libera matéria";
  if (materias.length === 1) return `Inclui ${materias[0].nome}`;
  return `Inclui ${materias.length} matérias`;
}

export default async function HomePage() {
  let produtos: {
    id: string;
    nome: string;
    slug: string;
    preco: number;
    preco_promocional: number | null;
    promocao_ate: string | null;
    descricao: string;
    materias: { nome: string }[];
  }[] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("produto")
      .select("id, nome, slug, preco, preco_promocional, promocao_ate, descricao, materias:produto_materia(materia:materia_id(nome))")
      .eq("ativo", true)
      .order("ordem")
      .limit(6);
    produtos = (data ?? []).map((item) => ({
      ...item,
      materias: (item.materias as { materia: { nome: string } | { nome: string }[] | null }[] | null)?.map((linha) => um(linha.materia)).filter((materia): materia is { nome: string } => Boolean(materia)) ?? [],
    }));
  }

  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-primary px-6 py-12 text-primary-foreground">
        <Logo size={72} />
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold">A Palavra de Deus é a nossa prioridade</h1>
        <p className="mt-4 max-w-2xl text-white/85">
          Estude teologia no seu tempo. Crie sua conta, escolha um produto na loja e acompanhe as aulas,
          o livro digital e a prova.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/loja" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
            Ver a loja
          </Link>
          <Link href="/cadastro" className="rounded-md border border-white/30 px-4 py-2 text-sm">
            Criar conta
          </Link>
        </div>
      </section>
      {!isSupabaseConfigured() ? <AvisoConfig /> : null}
      <section>
        <h2 className="text-xl font-semibold">Na loja</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {produtos.map((produto) => (
            <Link key={produto.id} href={`/loja/${produto.slug}`} className="rounded-xl border bg-card p-4 hover:border-primary">
              <p className="font-medium">{produto.nome}</p>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{produto.descricao}</p>
              <p className="mt-3 text-sm">{textoMaterias(produto.materias)}</p>
              <p className="mt-1 font-semibold">
                {formatBRL(precoVigente(Number(produto.preco), produto.preco_promocional, produto.promocao_ate).atual)}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
