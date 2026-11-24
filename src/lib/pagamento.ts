import { createServiceRoleClient } from "@/lib/supabase/admin";

type Pagamento = {
  id: number | string;
  status: string;
  external_reference?: string;
};

export async function processarPagamentoMercadoPago(paymentId: string) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const admin = createServiceRoleClient();
  if (!token || !admin) {
    throw new Error("Mercado Pago ou service role não configurados.");
  }

  const resposta = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resposta.ok) {
    throw new Error("Não foi possível consultar o pagamento.");
  }
  const pagamento = (await resposta.json()) as Pagamento;
  const pedidoId = pagamento.external_reference;
  if (!pedidoId) return;

  if (pagamento.status === "approved") {
    await admin
      .from("pedido")
      .update({ status: "pago", mp_payment_id: String(pagamento.id) })
      .eq("id", pedidoId)
      .eq("status", "pendente");

    const { data: pedido } = await admin
      .from("pedido")
      .select("aluno_id, status")
      .eq("id", pedidoId)
      .maybeSingle();
    if (!pedido || pedido.status !== "pago") return;

    const { data: itens } = await admin
      .from("pedido_item")
      .select("produto_id")
      .eq("pedido_id", pedidoId);

    for (const item of itens ?? []) {
      if (!item.produto_id) continue;
      await admin.rpc("criar_matricula", {
        p_aluno_id: pedido.aluno_id,
        p_produto_id: item.produto_id,
        p_origem: "compra",
        p_pedido_id: pedidoId,
      });
    }
    return;
  }

  if (pagamento.status === "rejected" || pagamento.status === "cancelled") {
    await admin
      .from("pedido")
      .update({ status: "recusado", mp_payment_id: String(pagamento.id) })
      .eq("id", pedidoId)
      .eq("status", "pendente");
  }
}
