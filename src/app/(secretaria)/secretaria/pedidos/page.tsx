import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireInterno } from "@/lib/session";
import { PageTitle } from "@/components/page-title";
import { formatBRL, formatDateTime } from "@/lib/format";
import { um } from "@/lib/relacao";

const STATUS = {
  pendente: "Aguardando pagamento",
  pago: "Pago",
  cancelado: "Cancelado",
  recusado: "Recusado",
} as const;

export default async function PedidosSecretariaPage() {
  await requireInterno();
  const supabase = await createClient();
  const { data } = await supabase
    .from("pedido")
    .select("id, status, valor_total, data_criacao, aluno:aluno_id(nome), itens:pedido_item(nome)")
    .order("data_criacao", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageTitle title="Pedidos" description="A matrícula só é criada quando o produto tem matérias." />
      <ul className="space-y-3">
        {(data ?? []).map((pedido) => {
          const aluno = um(pedido.aluno as { nome: string } | { nome: string }[] | null);
          const itens = (pedido.itens ?? []) as { nome: string }[];
          return (
            <li key={pedido.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{aluno?.nome ?? "Aluno"}</p>
                  <p className="text-sm text-muted-foreground">
                    {STATUS[pedido.status as keyof typeof STATUS]} · {formatDateTime(pedido.data_criacao)}
                  </p>
                </div>
                <p className="font-semibold">{formatBRL(pedido.valor_total)}</p>
              </div>
              <ul className="mt-2 text-sm">
                {itens.map((item, indice) => (
                  <li key={`${item.nome}-${indice}`}>
                    {item.nome}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
      {(data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pedido.</p> : null}
      <p className="mt-4 text-sm">
        <Link href="/secretaria/alunos">Ir para alunos</Link>
      </p>
    </div>
  );
}
