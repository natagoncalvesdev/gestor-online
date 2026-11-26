"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/session";
import { siteUrl } from "@/lib/site";
import { precoVigente } from "@/lib/preco";
import type { FormState } from "@/lib/form-state";
import { mensagemResultado } from "@/lib/prova-mensagem";
import { um } from "@/lib/relacao";

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
  const topicoId = String(formData.get("topico_id") ?? "");
  const matriculaId = String(formData.get("matricula_id") ?? "");
  const materiaId = String(formData.get("materia_id") ?? "");
  const supabase = await createClient();
  let statusAntes: string | null = null;
  if (!topicoId && matriculaId && materiaId) {
    const { data } = await supabase
      .from("matricula_materia")
      .select("status")
      .eq("matricula_id", matriculaId)
      .eq("materia_id", materiaId)
      .maybeSingle();
    statusAntes = (data?.status as string | undefined) ?? null;
  }
  if (!aulaId) return { error: "Aula não encontrada." };
  const { error } = await supabase.from("aula_progresso").upsert({
    aluno_id: session.user.id,
    aula_id: aulaId,
    video_concluido: true,
    atualizado_em: new Date().toISOString(),
  });
  if (error) return { error: error.message };
  let materiaConcluida = false;
  if (!topicoId && matriculaId && materiaId && statusAntes && statusAntes !== "concluida") {
    const { data } = await supabase
      .from("matricula_materia")
      .select("status")
      .eq("matricula_id", matriculaId)
      .eq("materia_id", materiaId)
      .maybeSingle();
    materiaConcluida = data?.status === "concluida";
  }
  if (aulaId) revalidatePath(`/aula/${aulaId}`);
  if (topicoId) revalidatePath(`/topico/${topicoId}`);
  if (matriculaId && materiaId) revalidatePath(`/meus-cursos/${matriculaId}/${materiaId}`);
  if (materiaId) revalidatePath(`/meus-cursos/aberto/${materiaId}`);
  revalidatePath("/meus-cursos", "layout");
  if (materiaConcluida) {
    return { ok: "Aula marcada como assistida. Matéria concluída e a próxima da sequência foi liberada, se houver vaga." };
  }
  return { ok: "Aula marcada como assistida." };
}

export async function salvarProgressoEbook(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session || session.type !== "aluno") return null;
  const aulaId = String(formData.get("aula_id") ?? "");
  const topicoId = String(formData.get("topico_id") ?? "");
  const cfi = String(formData.get("cfi") ?? "");
  if (!cfi || !aulaId) return null;
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
  const questionarioId = String(formData.get("questionario_id") ?? "") || null;
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
    p_questionario_id: questionarioId,
  });
  if (error) {
    if (error.message.includes("sem questoes")) return { error: "Esta matéria ainda não tem prova." };
    return { error: "Não foi possível registrar a prova." };
  }

  const resultado = data as { nota: number; aprovado: boolean; acertos: number; total: number; encerra?: boolean };
  revalidatePath("/meus-cursos");
  revalidatePath(`/prova/${materiaId}`);
  if (questionarioId) revalidatePath(`/questionario/${questionarioId}`);
  const nota = `Nota ${resultado.nota} (${resultado.acertos} de ${resultado.total}).`;
  if (resultado.encerra === false) {
    return {
      ok: resultado.aprovado
        ? `${nota} Questionário concluído.`
        : `${nota} Você pode tentar de novo.`,
    };
  }
  return {
    ok: resultado.aprovado
      ? `Aprovado com ${nota} A próxima matéria foi liberada se ainda havia vaga.`
      : `${nota} A matéria continua aberta para uma nova tentativa.`,
  };
}

export type ResultadoQuestionario = {
  nota: number;
  aprovado: boolean;
  acertos: number;
  total: number;
  mensagem: string;
  corretas: string[];
};

type RespostaMarcada = { questao_id: string; alternativa_id: string };

export async function tentativaProvaPendente(alunoId: string, materiaId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tentativa_prova")
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("materia_id", materiaId)
    .is("nota", null)
    .is("iniciada_em", null)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

export async function respostasDaProva(supabase: Awaited<ReturnType<typeof createClient>>, andamentoId: string) {
  const { data: copias } = await supabase.from("prova_questao").select("id").eq("prova_andamento_id", andamentoId);
  const ids = (copias ?? []).map((item) => item.id as string);
  if (ids.length === 0) return [] as RespostaMarcada[];
  const { data: marcadas } = await supabase.from("prova_resposta").select("prova_questao_id, alternativa_id").in("prova_questao_id", ids);
  return (marcadas ?? []).map((item) => ({
    questao_id: item.prova_questao_id as string,
    alternativa_id: item.alternativa_id as string,
  }));
}

export async function gabaritoDaProva(andamentoId: string) {
  const admin = createServiceRoleClient();
  if (!admin) return [] as string[];
  const { data: copias } = await admin.from("prova_questao").select("id").eq("prova_andamento_id", andamentoId);
  const ids = (copias ?? []).map((item) => item.id as string);
  if (ids.length === 0) return [] as string[];
  const { data: gabarito } = await admin.from("prova_questao_alternativa").select("id").eq("correta", true).in("prova_questao_id", ids);
  return (gabarito ?? []).map((item) => item.id as string);
}

export async function submeterQuestionario(entrada: {
  materiaId: string;
  questionarioId: string;
  respostas: { questao_id: string; alternativa_id: string }[];
  porTempo?: boolean;
}): Promise<{ error: string } | { ok: true; resultado: ResultadoQuestionario }> {
  const session = await getSession();
  if (!session || session.type !== "aluno") return { error: "Entre com a conta de aluno." };
  if (!entrada.materiaId || !entrada.questionarioId) return { error: "Prova inválida." };
  if (entrada.respostas.length === 0 && !entrada.porTempo) return { error: "Responda as questões antes de enviar." };

  const supabase = await createClient();
  const { data: questionario } = await supabase
    .from("questionario")
    .select("encerra_materia")
    .eq("id", entrada.questionarioId)
    .maybeSingle();
  let sessaoId: string | null = null;
  if (questionario?.encerra_materia) {
    const { data: aberta } = await supabase
      .from("tentativa_prova")
      .select("id")
      .eq("aluno_id", session.user.id)
      .eq("questionario_id", entrada.questionarioId)
      .is("entregue_em", null)
      .not("iniciada_em", "is", null)
      .maybeSingle();
    if (!aberta) return { error: "Inicie a prova antes de enviar." };
    sessaoId = aberta.id as string;
  }

  const { data, error } = await supabase.rpc("submeter_prova", {
    p_materia_id: entrada.materiaId,
    p_respostas: entrada.respostas,
    p_questionario_id: entrada.questionarioId,
  });
  if (error) {
    if (error.message.includes("sem questoes")) return { error: "Esta matéria ainda não tem prova." };
    if (error.message.includes("nao iniciada")) return { error: "Inicie a prova antes de enviar." };
    return { error: "Não foi possível registrar a prova." };
  }

  const resultado = data as { nota: number; aprovado: boolean; acertos: number; total: number; encerra?: boolean };
  if (sessaoId) {
    await supabase
      .from("tentativa_prova")
      .update({
        entregue_em: new Date().toISOString(),
        nota: resultado.nota,
        acertos: resultado.acertos,
        total: resultado.total,
        aprovado: resultado.aprovado,
      })
      .eq("id", sessaoId)
      .is("entregue_em", null);
  }
  const admin = createServiceRoleClient();
  let corretas: string[] = [];
  if (sessaoId) {
    corretas = await gabaritoDaProva(sessaoId);
  } else {
    const ids = entrada.respostas.map((item) => item.questao_id);
    if (admin && ids.length > 0) {
      const { data: gabarito } = await admin.from("alternativa").select("id, questao_id").in("questao_id", ids).eq("correta", true);
      corretas = (gabarito ?? []).map((item) => item.id as string);
    }
  }

  revalidatePath("/meus-cursos");
  revalidatePath(`/prova/${entrada.materiaId}`);
  revalidatePath(`/questionario/${entrada.questionarioId}`);
  const mensagem = mensagemResultado(resultado.nota, resultado.acertos, resultado.total, resultado.aprovado, resultado.encerra);

  return {
    ok: true,
    resultado: {
      nota: resultado.nota,
      aprovado: resultado.aprovado,
      acertos: resultado.acertos,
      total: resultado.total,
      mensagem,
      corretas,
    },
  };
}

type QuestaoProvaDto = {
  id: string;
  enunciado: string;
  ordem: number;
  alternativas: { id: string; texto: string; ordem: number }[];
};

export async function iniciarProva(questionarioId: string): Promise<
  | { error: string }
  | {
      ok: true;
      concluida?: boolean;
      expiraEm: string;
      servidorAgora: string;
      duracaoMinutos: number;
      respostas: RespostaMarcada[];
      questoes: QuestaoProvaDto[];
      resultado?: ResultadoQuestionario;
      codigo: string | null;
    }
> {
  const session = await getSession();
  if (!session || session.type !== "aluno") return { error: "Entre com a conta de aluno." };
  const supabase = await createClient();
  const { data: questionario } = await supabase
    .from("questionario")
    .select("id, materia_id, encerra_materia, materia:materia_id(prova_duracao_minutos)")
    .eq("id", questionarioId)
    .maybeSingle();
  if (!questionario?.encerra_materia) return { error: "Este questionário não usa tempo." };

  const materia = Array.isArray(questionario.materia) ? questionario.materia[0] : questionario.materia;
  const duracao = Number((materia as { prova_duracao_minutos?: number } | null)?.prova_duracao_minutos ?? 60);
  const { data: aberta } = await supabase
    .from("tentativa_prova")
    .select("id, expira_em, codigo, iniciada_em")
    .eq("aluno_id", session.user.id)
    .eq("questionario_id", questionarioId)
    .is("entregue_em", null)
    .not("iniciada_em", "is", null)
    .maybeSingle();

  const { data: pendente } = await supabase
    .from("tentativa_prova")
    .select("id")
    .eq("aluno_id", session.user.id)
    .eq("questionario_id", questionarioId)
    .is("entregue_em", null)
    .is("iniciada_em", null)
    .maybeSingle();
  const novaLiberada = Boolean(pendente) || (await tentativaProvaPendente(session.user.id, questionario.materia_id as string));

  if (!aberta && !novaLiberada) {
    const { data: concluida } = await supabase
      .from("tentativa_prova")
      .select("id, expira_em, nota, acertos, total, aprovado, codigo")
      .eq("aluno_id", session.user.id)
      .eq("questionario_id", questionarioId)
      .not("entregue_em", "is", null)
      .order("entregue_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (concluida) {
      const { data: questoes } = await supabase.rpc("questoes_do_andamento", { p_andamento: concluida.id });
      const nota = Number(concluida.nota ?? 0);
      const acertos = Number(concluida.acertos ?? 0);
      const total = Number(concluida.total ?? 0);
      const aprovado = Boolean(concluida.aprovado);
      return {
        ok: true,
        concluida: true,
        expiraEm: concluida.expira_em as string,
        servidorAgora: new Date().toISOString(),
        duracaoMinutos: duracao,
        codigo: (concluida.codigo as string | null) ?? null,
        respostas: await respostasDaProva(supabase, concluida.id as string),
        questoes: (questoes ?? []) as QuestaoProvaDto[],
        resultado: {
          nota,
          aprovado,
          acertos,
          total,
          mensagem: mensagemResultado(nota, acertos, total, aprovado, true),
          corretas: await gabaritoDaProva(concluida.id as string),
        },
      };
    }
  }

  let andamentoId = aberta?.id as string | undefined;
  let expiraEm = aberta?.expira_em as string | undefined;
  let codigoProva = (aberta?.codigo as string | null | undefined) ?? null;
  const duracaoMinutos = duracao;

  if (!aberta) {
    const inicio = new Date();
    const expira = new Date(inicio.getTime() + duracao * 60_000);
    const adminVinculo = createServiceRoleClient() ?? supabase;
    const { data: vinculos } = await adminVinculo
      .from("matricula_materia")
      .select("matricula_id, matricula:matricula_id(aluno_id)")
      .eq("materia_id", questionario.materia_id)
      .in("status", ["liberada", "concluida"]);
    const linhaVinculo = (vinculos ?? []).find((item) => {
      const matricula = um(item.matricula as { aluno_id: string } | { aluno_id: string }[] | null);
      return matricula?.aluno_id === session.user.id;
    });
    const pendenteId =
      (pendente?.id as string | undefined) ??
      (
        await supabase
          .from("tentativa_prova")
          .select("id")
          .eq("aluno_id", session.user.id)
          .eq("materia_id", questionario.materia_id)
          .is("nota", null)
          .is("iniciada_em", null)
          .limit(1)
          .maybeSingle()
      ).data?.id;
    if (pendenteId) {
      const { data: atualizada, error } = await supabase
        .from("tentativa_prova")
        .update({
          iniciada_em: inicio.toISOString(),
          expira_em: expira.toISOString(),
          questionario_id: questionarioId,
        })
        .eq("id", pendenteId)
        .select("id, expira_em, codigo")
        .maybeSingle();
      if (error) return { error: "Não foi possível iniciar a prova." };
      andamentoId = (atualizada?.id as string | undefined) ?? pendenteId;
      expiraEm = (atualizada?.expira_em as string | undefined) ?? expira.toISOString();
      codigoProva = (atualizada?.codigo as string | null | undefined) ?? null;
    } else {
      const { data: criada, error } = await supabase
        .from("tentativa_prova")
        .insert({
          aluno_id: session.user.id,
          materia_id: questionario.materia_id,
          matricula_id: linhaVinculo?.matricula_id ?? null,
          questionario_id: questionarioId,
          iniciada_em: inicio.toISOString(),
          expira_em: expira.toISOString(),
        })
        .select("id, expira_em, codigo")
        .maybeSingle();
      if (error && error.code !== "23505") return { error: "Não foi possível iniciar a prova." };
      if (criada) {
        andamentoId = criada.id as string;
        expiraEm = criada.expira_em as string;
        codigoProva = (criada.codigo as string | null) ?? null;
      } else {
        const { data: existente } = await supabase
          .from("tentativa_prova")
          .select("id, expira_em, codigo")
          .eq("aluno_id", session.user.id)
          .eq("questionario_id", questionarioId)
          .is("entregue_em", null)
          .not("iniciada_em", "is", null)
          .maybeSingle();
        if (!existente) return { error: "Não foi possível iniciar a prova." };
        andamentoId = existente.id as string;
        expiraEm = existente.expira_em as string;
        codigoProva = (existente.codigo as string | null) ?? null;
      }
    }
  }

  if (!andamentoId || !expiraEm) return { error: "Não foi possível iniciar a prova." };
  const admin = createServiceRoleClient();
  if (admin) {
    const { error: montarErro } = await admin.rpc("montar_prova_andamento", { p_andamento: andamentoId });
    if (montarErro) return { error: "Não foi possível montar as questões da prova." };
  }

  const { data: questoes, error: erroQuestoes } = await supabase.rpc("questoes_do_andamento", {
    p_andamento: andamentoId,
  });
  const respostas = await respostasDaProva(supabase, andamentoId);
  if (erroQuestoes) return { error: "Não foi possível abrir as questões." };
  return {
    ok: true,
    expiraEm,
    servidorAgora: new Date().toISOString(),
    duracaoMinutos,
    codigo: codigoProva,
    respostas,
    questoes: (questoes ?? []) as { id: string; enunciado: string; ordem: number; alternativas: { id: string; texto: string; ordem: number }[] }[],
  };
}

export async function salvarRespostaProva(
  questionarioId: string,
  questaoId: string,
  alternativaId: string
): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session || session.type !== "aluno") return { error: "Entre com a conta de aluno." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("salvar_resposta_prova", {
    p_questionario_id: questionarioId,
    p_prova_questao_id: questaoId,
    p_alternativa_id: alternativaId,
  });
  if (error) {
    if (error.message.includes("tempo")) return { error: "O tempo da prova terminou." };
    return { error: "Não foi possível gravar a resposta." };
  }
  return { ok: true };
}
