import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
import { PageTitle } from "@/components/page-title";
import { formatBRL, formatDateTime } from "@/lib/format";

const STATUS = {
  pendente: "Aguardando pagamento",
  pago: "Pago",
  cancelado: "Cancelado",
  recusado: "Recusado",
} as const;

export default async function PedidosPage() {
  const session = await requireAluno();
  const supabase = await createClient();
  const { data } = await supabase
    .from("pedido")
    .select("id, status, valor_total, data_criacao")
    .eq("aluno_id", session.user.id)
    .order("data_criacao", { ascending: false });

  return (
    <div>
      <PageTitle title="Pedidos" />
      {(data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Você ainda não fez pedidos.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {(data ?? []).map((pedido) => (
            <li key={pedido.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{formatBRL(pedido.valor_total)}</p>
                <p className="text-sm text-muted-foreground">
                  {STATUS[pedido.status as keyof typeof STATUS]} · {formatDateTime(pedido.data_criacao)}
                </p>
              </div>
              <Link href={`/pedidos/${pedido.id}`} className="text-sm text-primary">
                Detalhe
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
