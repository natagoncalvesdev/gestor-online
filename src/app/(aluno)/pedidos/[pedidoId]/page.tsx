import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
import { formatBRL, formatDateTime } from "@/lib/format";
import { um } from "@/lib/relacao";

const STATUS = {
  pendente: "Aguardando pagamento",
  pago: "Pago",
  cancelado: "Cancelado",
  recusado: "Recusado",
} as const;

export default async function PedidoPage({ params }: { params: Promise<{ pedidoId: string }> }) {
  const { pedidoId } = await params;
  const session = await requireAluno();
  const supabase = await createClient();
  const { data: pedido } = await supabase
    .from("pedido")
    .select("id, status, valor_total, data_criacao, itens:pedido_item(nome, preco, curso:curso_id(nome))")
    .eq("id", pedidoId)
    .eq("aluno_id", session.user.id)
    .maybeSingle();
  if (!pedido) notFound();

  const itens = (pedido.itens ?? []) as {
    nome: string;
    preco: number;
    curso: { nome: string } | { nome: string }[] | null;
  }[];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Pedido</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {STATUS[pedido.status as keyof typeof STATUS]} · {formatDateTime(pedido.data_criacao)}
      </p>
      {pedido.status === "pendente" ? (
        <p className="mt-3 text-sm">Se você já pagou, aguarde a confirmação do Mercado Pago e atualize a página.</p>
      ) : null}
      <ul className="mt-6 divide-y rounded-xl border bg-card">
        {itens.map((item, indice) => {
          const curso = um(item.curso);
          return (
            <li key={`${item.nome}-${indice}`} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{item.nome}</p>
                <p className="text-sm text-muted-foreground">{curso ? `Curso: ${curso.nome}` : "Sem curso vinculado"}</p>
              </div>
              <p>{formatBRL(item.preco)}</p>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-lg font-semibold">Total {formatBRL(pedido.valor_total)}</p>
    </div>
  );
}
