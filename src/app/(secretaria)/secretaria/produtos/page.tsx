import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";
import { PageTitle } from "@/components/page-title";
import { formatBRL } from "@/lib/format";
import { um } from "@/lib/relacao";

export default async function ProdutosPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("produto")
    .select("id, nome, preco, ativo, curso:curso_id(nome)")
    .order("nome");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <PageTitle title="Produtos" description="O curso é opcional. Sem curso, a compra só registra o pedido." />
        <Link href="/secretaria/produtos/novo" className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
          Novo produto
        </Link>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {(data ?? []).map((produto) => {
          const curso = um(produto.curso as { nome: string } | { nome: string }[] | null);
          return (
            <li key={produto.id}>
              <Link href={`/secretaria/produtos/${produto.id}`} className="block p-4 hover:bg-secondary">
                <p className="font-medium">{produto.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {formatBRL(produto.preco)} · {curso?.nome ?? "Sem curso"}
                  {produto.ativo ? "" : " · inativo"}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
