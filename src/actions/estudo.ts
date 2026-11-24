"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";
import { siteUrl } from "@/lib/site";
import { precoVigente } from "@/lib/preco";
import type { FormState } from "@/lib/form-state";

type ItemPedido = { produtoId: string; variacaoId: string | null };

export async function iniciarCheckout(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.type !== "aluno") {
    return { error: "A compra é feita com uma conta de aluno." };
  }

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return { error: "Mercado Pago ainda não está configurado." };

  let itens: ItemPedido[] = [];
  try {
    itens = JSON.parse(String(formData.get("itens") ?? "[]")) as ItemPedido[];
  } catch {
    return { error: "Carrinho inválido." };
  }
  if (itens.length === 0) return { error: "O carrinho está vazio." };

  const supabase = await createClient();
  const linhas: {
    produto_id: string;
    variacao_id: string | null;
    nome: string;
    preco: number;
  }[] = [];

  for (const item of itens) {
    const { data: produto } = await supabase
      .from("produto")
      .select("id, nome, preco, preco_promocional, promocao_ate, ativo")
      .eq("id", item.produtoId)
      .maybeSingle();
    if (!produto || !produto.ativo) return { error: "Um produto do carrinho não está mais disponível." };

    let preco = precoVigente(Number(produto.preco), produto.preco_promocional, produto.promocao_ate).atual;
    let nome = produto.nome as string;
    let variacaoId: string | null = null;

    const { count } = await supabase
      .from("produto_variacao")
      .select("id", { count: "exact", head: true })
      .eq("produto_id", produto.id)
      .eq("ativo", true);

    if ((count ?? 0) > 0) {
      if (!item.variacaoId) return { error: `Escolha uma opção de ${produto.nome}.` };
      const { data: variacao } = await supabase
        .from("produto_variacao")
        .select("id, nome, preco, ativo")
        .eq("id", item.variacaoId)
        .eq("produto_id", produto.id)
        .maybeSingle();
      if (!variacao || !variacao.ativo) return { error: `A opção de ${produto.nome} não está disponível.` };
      preco = Number(variacao.preco);
      nome = `${produto.nome} — ${variacao.nome}`;
      variacaoId = variacao.id;
    }

    linhas.push({
      produto_id: produto.id,
      variacao_id: variacaoId,
      nome,
      preco,
    });
  }

  const valorTotal = linhas.reduce((soma, linha) => soma + linha.preco, 0);
  const { data: pedido, error } = await supabase
    .from("pedido")
    .insert({ aluno_id: session.user.id, valor_total: valorTotal, status: "pendente" })
    .select("id")
    .single();
  if (error || !pedido) return { error: "Não foi possível abrir o pedido." };

  const { error: itemError } = await supabase.from("pedido_item").insert(
    linhas.map((linha) => ({ ...linha, pedido_id: pedido.id }))
  );
  if (itemError) return { error: itemError.message };

  const base = siteUrl();
  const body: Record<string, unknown> = {
    items: linhas.map((linha) => ({
      title: linha.nome,
      quantity: 1,
      unit_price: linha.preco,
      currency_id: "BRL",
    })),
    external_reference: pedido.id,
    notification_url: `${base}/api/mercadopago/webhook`,
    back_urls: {
      success: `${base}/pedidos/${pedido.id}`,
      failure: `${base}/pedidos/${pedido.id}`,
      pending: `${base}/pedidos/${pedido.id}`,
    },
  };
  if (base.startsWith("https://")) body.auto_return = "approved";

  const resposta = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const preference = (await resposta.json()) as {
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
    message?: string;
  };
  if (!resposta.ok || !preference.id) {
    return { error: preference.message || "O Mercado Pago recusou a preferência de pagamento." };
  }

  await supabase.from("pedido").update({ mp_preference_id: preference.id }).eq("id", pedido.id);

  const destino =
    token.startsWith("TEST") && preference.sandbox_init_point
      ? preference.sandbox_init_point
      : preference.init_point;
  if (!destino) return { error: "O Mercado Pago não devolveu o link de pagamento." };
  redirect(destino);
}

export async function marcarAulaVista(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || session.type !== "aluno") return { error: "Entre com a conta de aluno." };
  const aulaId = String(formData.get("aula_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("aula_progresso").upsert({
    aluno_id: session.user.id,
    aula_id: aulaId,
    video_concluido: true,
    atualizado_em: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath(`/aula/${aulaId}`);
  return { ok: "Aula marcada como assistida." };
}

export async function salvarProgressoEbook(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || session.type !== "aluno") return null;
  const aulaId = String(formData.get("aula_id") ?? "");
  const cfi = String(formData.get("cfi") ?? "");
  if (!cfi) return null;
  const supabase = await createClient();
  await supabase.from("aula_progresso").upsert({
    aluno_id: session.user.id,
    aula_id: aulaId,
    ebook_cfi: cfi,
    atualizado_em: new Date().toISOString(),
  });
  return null;
}

export async function enviarProva(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || session.type !== "aluno") return { error: "Entre com a conta de aluno." };
  const materiaId = String(formData.get("materia_id") ?? "");
  const respostas: { questao_id: string; alternativa_id: string }[] = [];
  for (const [chave, valor] of formData.entries()) {
    if (chave.startsWith("questao_") && typeof valor === "string" && valor) {
      respostas.push({ questao_id: chave.slice("questao_".length), alternativa_id: valor });
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submeter_prova", {
    p_materia_id: materiaId,
    p_respostas: respostas,
  });
  if (error) {
    if (error.message.includes("sem questoes")) return { error: "Esta matéria ainda não tem prova." };
    return { error: "Não foi possível registrar a prova." };
  }

  const resultado = data as { nota: number; aprovado: boolean; acertos: number; total: number };
  revalidatePath("/meus-cursos");
  revalidatePath(`/prova/${materiaId}`);
  return {
    ok: resultado.aprovado
      ? `Aprovado com nota ${resultado.nota} (${resultado.acertos} de ${resultado.total}). A próxima matéria foi liberada se ainda havia vaga.`
      : `Nota ${resultado.nota} (${resultado.acertos} de ${resultado.total}). A matéria continua aberta para uma nova tentativa.`,
  };
}
