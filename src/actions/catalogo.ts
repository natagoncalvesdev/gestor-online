"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/session";
import { horarioBrasilia, idYoutube } from "@/lib/ebd";
import { slugify } from "@/lib/slug";
import type { FormState } from "@/lib/form-state";
import { sincronizarCategoriasDoProduto } from "@/actions/produto-categoria";

function dbMessage(error: { code?: string; message: string }) {
  if (error.code === "23505") return "Já existe um registro com estes dados.";
  if (error.code === "23503") return "Este produto já tem matrícula e não pode ser excluído.";
  return error.message;
}

function htmlConteudo(valor: string) {
  return valor.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "").trim();
}

async function storageAdmin() {
  const admin = createServiceRoleClient();
  if (!admin) return { admin: null, error: "Configure a service role para enviar arquivos." };
  return { admin, error: null };
}

export async function salvarMateria(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const codigo = String(formData.get("codigo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const carga = Number(formData.get("carga_horaria") ?? 0);
  const nota = Number(formData.get("nota_minima") ?? 7);
  const validadeInformada = String(formData.get("validade_dias") ?? "").trim();
  const validadeDias = validadeInformada === "" ? null : Number(validadeInformada);
  const ativa = formData.get("ativo") === "on";

  if (!nome || !codigo) return { error: "Informe o nome e o código da matéria." };
  if (Number.isNaN(nota) || nota < 0 || nota > 10) return { error: "A nota mínima fica entre 0 e 10." };
  if (validadeDias != null && (!Number.isInteger(validadeDias) || validadeDias < 1)) {
    return { error: "Informe a validade em dias inteiros, como 90." };
  }

  const payload = {
    nome,
    codigo,
    descricao,
    carga_horaria: Number.isFinite(carga) ? carga : 0,
    nota_minima: nota,
    validade_dias: validadeDias,
    ativo: ativa,
  };

  let ordem = 1;
  if (!id) {
    const { data: ultima } = await supabase.from("materia").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle();
    ordem = Number(ultima?.ordem ?? 0) + 1;
  }

  const { data: criada, error } = id
    ? await supabase.from("materia").update(payload).eq("id", id).select("id").single()
    : await supabase.from("materia").insert({ ...payload, ordem }).select("id").single();

  if (error || !criada) return { error: error ? dbMessage(error) : "Não foi possível salvar a matéria." };
  revalidatePath("/secretaria/materias");
  revalidatePath(`/secretaria/materias/${criada.id}`);
  return { ok: id ? "Matéria atualizada." : "Matéria criada." };
}

export async function salvarAula(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const materiaId = String(formData.get("materia_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const ordemInformada = formData.has("ordem");
  const ordem = Number(formData.get("ordem") ?? 1);
  const video = String(formData.get("bunny_video_id") ?? "").trim();
  const youtube = idYoutube(video);
  const topicoInformado = formData.has("topico_id");
  const topicoId = String(formData.get("topico_id") ?? "").trim() || null;
  const conteudoInformado = formData.has("conteudo");
  const file = formData.get("epub");

  if (!titulo || !materiaId) return { error: "Informe o título da aula." };
  if (ordemInformada && (!Number.isFinite(ordem) || ordem < 1)) return { error: "A ordem começa em 1." };
  const extras = {
    ...(ordemInformada || !id ? { ordem: ordemInformada ? ordem : 1 } : {}),
    ...(conteudoInformado ? { conteudo: htmlConteudo(String(formData.get("conteudo") ?? "")) } : {}),
  };

  let epubPath: string | undefined;
  let epubNome: string | undefined;

  if (file instanceof File && file.size > 0) {
    if (!file.name.toLowerCase().endsWith(".epub")) {
      return { error: "O livro digital precisa ser um arquivo EPUB." };
    }
    const { admin, error } = await storageAdmin();
    if (!admin) return { error: error ?? "Upload indisponível." };
    const aulaId = id || crypto.randomUUID();
    epubPath = `${materiaId}/${aulaId}.epub`;
    epubNome = file.name;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage.from("ebooks").upload(epubPath, bytes, {
      contentType: "application/epub+zip",
      upsert: true,
    });
    if (uploadError) return { error: uploadError.message };

    const payload = {
      id: aulaId,
      materia_id: materiaId,
      titulo,
      bunny_video_id: youtube ? null : video || null,
      youtube_id: youtube,
      ...(topicoInformado ? { topico_id: topicoId } : {}),
      libera_em: horarioBrasilia(String(formData.get("libera_em") ?? "")),
      epub_path: epubPath,
      epub_nome: epubNome,
      ...extras,
    };
    const { error: saveError } = id
      ? await supabase.from("aula").update(payload).eq("id", id)
      : await supabase.from("aula").insert(payload);
    if (saveError) return { error: dbMessage(saveError) };
  } else {
    const payload = {
      materia_id: materiaId,
      titulo,
      bunny_video_id: youtube ? null : video || null,
      youtube_id: youtube,
      ...(topicoInformado ? { topico_id: topicoId } : {}),
      libera_em: horarioBrasilia(String(formData.get("libera_em") ?? "")),
      ...extras,
    };
    const { error: saveError } = id
      ? await supabase.from("aula").update(payload).eq("id", id)
      : await supabase.from("aula").insert(payload);
    if (saveError) return { error: dbMessage(saveError) };
  }

  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "Aula salva." };
}

export async function excluirAula(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const materiaId = String(formData.get("materia_id") ?? "");
  const epubPath = String(formData.get("epub_path") ?? "");
  const { data: arquivos } = await supabase.from("aula_arquivo").select("path").eq("aula_id", id);
  const { error } = await supabase.from("aula").delete().eq("id", id);
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/materias/${materiaId}`);
  const admin = createServiceRoleClient();
  const paths = [epubPath, ...(arquivos ?? []).map((arquivo) => arquivo.path)].filter(Boolean);
  if (paths.length && admin) await admin.storage.from("ebooks").remove(paths);
  return { ok: "Aula excluída." };
}

export async function adicionarArquivoAula(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const aulaId = String(formData.get("aula_id") ?? "");
  const topicoId = String(formData.get("topico_id") ?? "") || null;
  const materiaId = String(formData.get("materia_id") ?? "");
  const modo = String(formData.get("modo") ?? "");
  const visualizar = modo === "visualizar" || modo === "ambos";
  const baixar = modo === "baixar" || modo === "ambos";
  const nome = String(formData.get("nome") ?? "").trim();
  const arquivo = formData.get("arquivo");
  if (!nome) return { error: "Informe o nome do arquivo." };
  if (!visualizar && !baixar) return { error: "Escolha visualizar, baixar ou os dois." };
  if (!(arquivo instanceof File) || arquivo.size === 0) return { error: "Escolha um arquivo." };
  const { admin, error: storageError } = await storageAdmin();
  if (!admin) return { error: storageError };
  const supabase = await createClient();
  const extensao = arquivo.name.includes(".") ? arquivo.name.slice(arquivo.name.lastIndexOf(".")) : "";
  const nomeFinal = extensao && !nome.toLowerCase().endsWith(extensao.toLowerCase()) ? `${nome}${extensao}` : nome;
  const path = `arquivos/${aulaId}/${crypto.randomUUID()}-${arquivo.name.replace(/[^\w.\-]+/g, "_")}`;
  const { error: uploadError } = await admin.storage.from("ebooks").upload(path, Buffer.from(await arquivo.arrayBuffer()), {
    contentType: arquivo.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) return { error: uploadError.message };
  const { error } = await supabase.from("aula_arquivo").insert({
    aula_id: aulaId,
    topico_id: topicoId,
    nome: nomeFinal,
    path,
    mime: arquivo.type || "application/octet-stream",
    visualizar,
    baixar,
  });
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/materias/${materiaId}`);
  revalidatePath(`/aula/${aulaId}`);
  return { ok: "Arquivo adicionado." };
}

export async function excluirArquivoAula(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const materiaId = String(formData.get("materia_id") ?? "");
  const aulaId = String(formData.get("aula_id") ?? "");
  const { data: arquivo } = await supabase.from("aula_arquivo").select("path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("aula_arquivo").delete().eq("id", id);
  if (error) return { error: dbMessage(error) };
  if (arquivo?.path) {
    const admin = createServiceRoleClient();
    await admin?.storage.from("ebooks").remove([arquivo.path]);
  }
  revalidatePath(`/secretaria/materias/${materiaId}`);
  revalidatePath(`/aula/${aulaId}`);
  return { ok: "Arquivo removido." };
}

export async function clonarAula(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const materiaId = String(formData.get("materia_id") ?? "");
  const { data: aula } = await supabase.from("aula").select("titulo, conteudo, topico_id, bunny_video_id, youtube_id, libera_em, posicao").eq("id", id).maybeSingle();
  if (!aula) return { error: "Aula não encontrada." };
  const { data: ultima } = await supabase.from("aula").select("ordem").eq("materia_id", materiaId).order("ordem", { ascending: false }).limit(1).maybeSingle();
  const origem = Number(aula.posicao ?? 0);
  const [{ data: aulasDepois }, { data: topicosDepois }, { data: quizzesDepois }] = await Promise.all([
    supabase.from("aula").select("id, posicao").eq("materia_id", materiaId).gt("posicao", origem),
    supabase.from("aula_topico").select("id, posicao").eq("materia_id", materiaId).gt("posicao", origem),
    supabase.from("questionario").select("id, posicao").eq("materia_id", materiaId).is("aula_id", null).gt("posicao", origem),
  ]);
  for (const item of aulasDepois ?? []) {
    await supabase.from("aula").update({ posicao: Number(item.posicao) + 1 }).eq("id", item.id);
  }
  for (const item of topicosDepois ?? []) {
    await supabase.from("aula_topico").update({ posicao: Number(item.posicao) + 1 }).eq("id", item.id);
  }
  for (const item of quizzesDepois ?? []) {
    await supabase.from("questionario").update({ posicao: Number(item.posicao) + 1 }).eq("id", item.id);
  }
  const { data: copia, error } = await supabase.from("aula").insert({
    materia_id: materiaId,
    titulo: `${aula.titulo} (cópia)`,
    conteudo: aula.conteudo ?? "",
    ordem: Number(ultima?.ordem ?? 0) + 1,
    topico_id: aula.topico_id,
    posicao: origem + 1,
    bunny_video_id: aula.bunny_video_id,
    youtube_id: aula.youtube_id,
    libera_em: aula.libera_em,
  }).select("id").single();
  if (error || !copia) return { error: error ? dbMessage(error) : "Não foi possível clonar a aula." };
  const { data: arquivos } = await supabase.from("aula_arquivo").select("nome, path, mime, visualizar, baixar").eq("aula_id", id);
  if (arquivos?.length) {
    await supabase.from("aula_arquivo").insert(arquivos.map((arquivo) => ({ ...arquivo, aula_id: copia.id })));
  }
  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "Aula clonada." };
}

export async function salvarTopico(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const materiaId = String(formData.get("materia_id") ?? "");
  const { count } = await supabase.from("aula_topico").select("id", { count: "exact", head: true }).eq("materia_id", materiaId);
  const { error } = await supabase.from("aula_topico").insert({
    materia_id: materiaId,
    titulo: `Seção ${(count ?? 0) + 1}`,
    ordem: (count ?? 0) + 1,
    posicao: await reservarPosicao(supabase, materiaId),
  });
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "Seção criada." };
}

export async function renomearSecao(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const materiaId = String(formData.get("materia_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return { error: "Informe o nome da seção." };
  const { error } = await supabase.from("aula_topico").update({ titulo }).eq("id", String(formData.get("id") ?? ""));
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "Seção atualizada." };
}

export async function criarAula(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const materiaId = String(formData.get("materia_id") ?? "");
  const { count } = await supabase.from("aula").select("id", { count: "exact", head: true }).eq("materia_id", materiaId);
  const { data: topico } = await supabase
    .from("aula_topico")
    .select("id")
    .eq("materia_id", materiaId)
    .order("posicao", { ascending: false })
    .limit(1)
    .maybeSingle();
  const numero = (count ?? 0) + 1;
  const { error } = await supabase.from("aula").insert({
    materia_id: materiaId,
    titulo: `Aula ${numero}`,
    ordem: numero,
    topico_id: topico?.id ?? null,
    posicao: await reservarPosicao(supabase, materiaId),
  });
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "Aula criada." };
}

async function reservarPosicao(supabase: Awaited<ReturnType<typeof createClient>>, materiaId: string) {
  const [{ data: aulas }, { data: secoes }, { data: quizzes }] = await Promise.all([
    supabase.from("aula").select("posicao").eq("materia_id", materiaId),
    supabase.from("aula_topico").select("posicao").eq("materia_id", materiaId),
    supabase.from("questionario").select("id, posicao, encerra_materia").eq("materia_id", materiaId).is("aula_id", null),
  ]);
  const posicoes = [
    ...(aulas ?? []).map((item) => Number(item.posicao ?? 0)),
    ...(secoes ?? []).map((item) => Number(item.posicao ?? 0)),
    ...(quizzes ?? []).map((item) => Number(item.posicao ?? 0)),
  ];
  const maior = Math.max(0, ...posicoes);
  const prova = (quizzes ?? []).find((item) => item.encerra_materia && Number(item.posicao) === maior);
  if (prova) {
    await supabase.from("questionario").update({ posicao: maior + 1 }).eq("id", prova.id);
    return maior;
  }
  return maior + 1;
}

async function reservarPosicaoFilha(supabase: Awaited<ReturnType<typeof createClient>>, aulaId: string) {
  const [{ data: topico }, { data: quiz }] = await Promise.all([
    supabase.from("topico").select("posicao").eq("aula_id", aulaId).order("posicao", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("questionario").select("posicao").eq("aula_id", aulaId).order("posicao", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return Math.max(Number(topico?.posicao ?? 0), Number(quiz?.posicao ?? 0)) + 1;
}

export async function excluirTopico(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const materiaId = String(formData.get("materia_id") ?? "");
  const { error } = await supabase.from("aula_topico").delete().eq("id", String(formData.get("id") ?? ""));
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "Seção removida. As aulas continuam na matéria." };
}

export async function salvarQuestao(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const questionarioId = String(formData.get("questionario_id") ?? "");
  let materiaId = String(formData.get("materia_id") ?? "");
  const enunciado = String(formData.get("enunciado") ?? "").trim();
  const ordem = Number(formData.get("ordem") ?? 1);
  const correta = String(formData.get("correta") ?? "");
  if (questionarioId) {
    const { data: questionario } = await supabase.from("questionario").select("materia_id").eq("id", questionarioId).maybeSingle();
    if (!questionario) return { error: "Questionário não encontrado." };
    materiaId = questionario.materia_id as string;
  }

  const alternativas = [1, 2, 3, 4]
    .map((n) => ({ ordem: n, texto: String(formData.get(`alt_${n}`) ?? "").trim() }))
    .filter((alt) => alt.texto);

  if (!enunciado) return { error: "Informe o enunciado." };
  if (alternativas.length < 2) return { error: "Informe pelo menos duas alternativas." };
  if (!alternativas.some((alt) => String(alt.ordem) === correta)) {
    return { error: "Marque a alternativa correta." };
  }

  const { data: questao, error } = await supabase
    .from("questao")
    .insert({ materia_id: materiaId, questionario_id: questionarioId || null, enunciado, ordem })
    .select("id")
    .single();
  if (error || !questao) return { error: error ? dbMessage(error) : "Não foi possível salvar a questão." };

  const { error: altError } = await supabase.from("alternativa").insert(
    alternativas.map((alt) => ({
      questao_id: questao.id,
      texto: alt.texto,
      ordem: alt.ordem,
      correta: String(alt.ordem) === correta,
    }))
  );
  if (altError) {
    await supabase.from("questao").delete().eq("id", questao.id);
    return { error: dbMessage(altError) };
  }

  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "Questão adicionada." };
}

export async function excluirQuestao(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const materiaId = String(formData.get("materia_id") ?? "");
  const { error } = await supabase.from("questao").delete().eq("id", id);
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "Questão excluída." };
}

export async function adicionarMateriaProduto(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const produtoId = String(formData.get("produto_id") ?? "");
  const materiaId = String(formData.get("materia_id") ?? "");
  const ordem = Number(formData.get("ordem") ?? 1);
  if (!materiaId) return { error: "Escolha a matéria." };
  const { error } = await supabase.from("produto_materia").insert({
    produto_id: produtoId,
    materia_id: materiaId,
    ordem,
  });
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/produtos/${produtoId}`);
  return { ok: "Matéria vinculada ao produto." };
}

export async function reordenarMateriasProduto(produtoId: string, materiaIds: string[]): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();
  for (let indice = 0; indice < materiaIds.length; indice += 1) {
    const { error } = await supabase
      .from("produto_materia")
      .update({ ordem: 10000 + indice })
      .eq("produto_id", produtoId)
      .eq("materia_id", materiaIds[indice]);
    if (error) return { error: dbMessage(error) };
  }
  for (let indice = 0; indice < materiaIds.length; indice += 1) {
    const { error } = await supabase
      .from("produto_materia")
      .update({ ordem: indice + 1 })
      .eq("produto_id", produtoId)
      .eq("materia_id", materiaIds[indice]);
    if (error) return { error: dbMessage(error) };
  }
  revalidatePath(`/secretaria/produtos/${produtoId}`);
  return { ok: true };
}

export async function reordenarMaterias(materiaIds: string[]): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();
  for (let indice = 0; indice < materiaIds.length; indice += 1) {
    const { error } = await supabase.from("materia").update({ ordem: indice + 1 }).eq("id", materiaIds[indice]);
    if (error) return { error: dbMessage(error) };
  }
  revalidatePath("/secretaria/materias");
  return { ok: true };
}

export async function reordenarProdutos(produtoIds: string[]): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();
  for (let indice = 0; indice < produtoIds.length; indice += 1) {
    const { error } = await supabase.from("produto").update({ ordem: indice + 1 }).eq("id", produtoIds[indice]);
    if (error) return { error: dbMessage(error) };
  }
  revalidatePath("/secretaria/produtos");
  revalidatePath("/loja");
  return { ok: true };
}

export async function reordenarConteudo(
  materiaId: string,
  itens: { tipo: "secao" | "topico" | "aula" | "questionario"; id: string }[]
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();
  let secaoAtual: string | null = null;
  for (let indice = 0; indice < itens.length; indice += 1) {
    const item = itens[indice];
    const posicao = indice + 1;
    if (item.tipo === "secao" || item.tipo === "topico") {
      secaoAtual = item.id;
      const { error } = await supabase.from("aula_topico").update({ posicao }).eq("id", item.id);
      if (error) return { error: dbMessage(error) };
    } else if (item.tipo === "questionario") {
      const { error } = await supabase.from("questionario").update({ posicao, aula_id: null }).eq("id", item.id);
      if (error) return { error: dbMessage(error) };
    } else {
      const { error } = await supabase.from("aula").update({ posicao, topico_id: secaoAtual }).eq("id", item.id);
      if (error) return { error: dbMessage(error) };
    }
  }
  revalidatePath(`/secretaria/materias/${materiaId}`);
  revalidatePath("/meus-cursos", "layout");
  return { ok: true };
}

export async function reordenarFilhos(
  materiaId: string,
  aulaId: string,
  itens: { tipo: "topico" | "questionario"; id: string }[]
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: topicosAtuais } = await supabase.from("topico").select("id, posicao").eq("aula_id", aulaId);
  for (const topico of topicosAtuais ?? []) {
    const { error } = await supabase.from("topico").update({ posicao: Number(topico.posicao) + 100000 }).eq("id", topico.id);
    if (error) return { error: dbMessage(error) };
  }
  for (let indice = 0; indice < itens.length; indice += 1) {
    const item = itens[indice];
    const posicao = indice + 1;
    const { error } =
      item.tipo === "topico"
        ? await supabase.from("topico").update({ posicao, aula_id: aulaId }).eq("id", item.id)
        : await supabase.from("questionario").update({ posicao, aula_id: aulaId }).eq("id", item.id);
    if (error) return { error: dbMessage(error) };
  }
  revalidatePath(`/secretaria/materias/${materiaId}`);
  revalidatePath("/meus-cursos", "layout");
  return { ok: true };
}

export async function criarTopicoAula(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const materiaId = String(formData.get("materia_id") ?? "");
  const aulaId = String(formData.get("aula_id") ?? "");
  const { count } = await supabase.from("topico").select("id", { count: "exact", head: true }).eq("aula_id", aulaId);
  const { error } = await supabase.from("topico").insert({
    aula_id: aulaId,
    titulo: `Tópico ${(count ?? 0) + 1}`,
    posicao: await reservarPosicaoFilha(supabase, aulaId),
  });
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "Tópico criado." };
}

export async function salvarTopicoAula(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const materiaId = String(formData.get("materia_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const video = String(formData.get("bunny_video_id") ?? "").trim();
  const youtube = idYoutube(video);
  const file = formData.get("epub");
  if (!titulo) return { error: "Informe o título do tópico." };

  const payload: Record<string, string | null> = {
    titulo,
    conteudo: htmlConteudo(String(formData.get("conteudo") ?? "")),
    bunny_video_id: youtube ? null : video || null,
    youtube_id: youtube,
    libera_em: horarioBrasilia(String(formData.get("libera_em") ?? "")),
  };

  if (file instanceof File && file.size > 0) {
    if (!file.name.toLowerCase().endsWith(".epub")) return { error: "O livro digital precisa ser um arquivo EPUB." };
    const { admin, error } = await storageAdmin();
    if (!admin) return { error: error ?? "Upload indisponível." };
    const epubPath = `${materiaId}/topico-${id}.epub`;
    const { error: uploadError } = await admin.storage.from("ebooks").upload(epubPath, Buffer.from(await file.arrayBuffer()), {
      contentType: "application/epub+zip",
      upsert: true,
    });
    if (uploadError) return { error: uploadError.message };
    payload.epub_path = epubPath;
    payload.epub_nome = file.name;
  }

  const { error: saveError } = await supabase.from("topico").update(payload).eq("id", id);
  if (saveError) return { error: dbMessage(saveError) };
  revalidatePath(`/secretaria/materias/${materiaId}`);
  revalidatePath(`/topico/${id}`);
  return { ok: "Tópico salvo." };
}

export async function excluirTopicoAula(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const materiaId = String(formData.get("materia_id") ?? "");
  const epubPath = String(formData.get("epub_path") ?? "");
  const { data: arquivos } = await supabase.from("aula_arquivo").select("path").eq("topico_id", id);
  const { error } = await supabase.from("topico").delete().eq("id", id);
  if (error) return { error: dbMessage(error) };
  const admin = createServiceRoleClient();
  const paths = [epubPath, ...(arquivos ?? []).map((arquivo) => arquivo.path)].filter(Boolean);
  if (paths.length && admin) await admin.storage.from("ebooks").remove(paths);
  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "Tópico excluído." };
}

export async function criarQuestionario(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const materiaId = String(formData.get("materia_id") ?? "");
  const aulaId = String(formData.get("aula_id") ?? "") || null;
  const { count } = await supabase
    .from("questionario")
    .select("id", { count: "exact", head: true })
    .eq("materia_id", materiaId)
    .eq("encerra_materia", true);
  const encerra = !aulaId && (count ?? 0) === 0;
  const { error } = await supabase.from("questionario").insert({
    materia_id: materiaId,
    aula_id: aulaId,
    titulo: aulaId ? "Questionário" : "Prova",
    posicao: aulaId ? await reservarPosicaoFilha(supabase, aulaId) : await reservarPosicao(supabase, materiaId),
    encerra_materia: encerra,
  });
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "Questionário criado." };
}

export async function salvarQuestionario(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const materiaId = String(formData.get("materia_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const notaInformada = String(formData.get("nota_minima") ?? "").trim();
  const encerra = formData.get("encerra_materia") === "on";
  if (!titulo) return { error: "Informe o título do questionário." };
  let nota: number | null = null;
  if (notaInformada) {
    nota = Number(notaInformada);
    if (Number.isNaN(nota) || nota < 0 || nota > 10) return { error: "A nota mínima fica entre 0 e 10." };
  }
  if (encerra) {
    await supabase.from("questionario").update({ encerra_materia: false }).eq("materia_id", materiaId).neq("id", id);
  }
  const { error } = await supabase.from("questionario").update({ titulo, nota_minima: nota, encerra_materia: encerra }).eq("id", id);
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "Questionário salvo." };
}

export async function excluirQuestionario(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const materiaId = String(formData.get("materia_id") ?? "");
  const { error } = await supabase.from("questionario").delete().eq("id", String(formData.get("id") ?? ""));
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "Questionário excluído." };
}

export async function removerMateriaProduto(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const produtoId = String(formData.get("produto_id") ?? "");
  const materiaId = String(formData.get("materia_id") ?? "");
  const { error } = await supabase
    .from("produto_materia")
    .delete()
    .eq("produto_id", produtoId)
    .eq("materia_id", materiaId);
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/produtos/${produtoId}`);
  return { ok: "Matéria removida do produto." };
}

export async function salvarProduto(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const slugInformado = String(formData.get("slug") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const apresentacao = String(formData.get("apresentacao") ?? "");
  const preco = Number(formData.get("preco") ?? 0);
  const promocionalInformado = String(formData.get("preco_promocional") ?? "").trim();
  const promocaoAte = String(formData.get("promocao_ate") ?? "").trim();
  const pesoGramas = Number(formData.get("peso_gramas") ?? 0);
  const comprimento = Number(formData.get("comprimento_cm") ?? 0);
  const largura = Number(formData.get("largura_cm") ?? 0);
  const altura = Number(formData.get("altura_cm") ?? 0);
  const limite = Number(formData.get("materias_simultaneas") ?? 1);
  const categoriaIds = formData.getAll("categorias").map((valor) => String(valor)).filter(Boolean);
  const ativo = formData.get("ativo") === "on";
  const gratuita = formData.get("gratuita") === "on";
  const paraTodos = formData.get("para_todos") === "on";
  const agrupador = formData.get("agrupador") === "on";
  const precoPromocional = promocionalInformado === "" ? null : Number(promocionalInformado);

  if (!nome) return { error: "Informe o nome do produto." };
  if (!Number.isFinite(preco) || preco < 0) return { error: "Informe um preço válido." };
  if (precoPromocional != null && (!Number.isFinite(precoPromocional) || precoPromocional < 0)) {
    return { error: "Informe um preço promocional válido." };
  }
  if (promocaoAte && precoPromocional == null) return { error: "Informe o preço promocional para usar a data." };
  if (!Number.isInteger(pesoGramas) || pesoGramas < 0) return { error: "Informe o peso em gramas, sem casas decimais." };
  if (![comprimento, largura, altura].every((valor) => Number.isInteger(valor) && valor >= 0)) {
    return { error: "Informe as medidas em centímetros, sem casas decimais." };
  }
  if (![1, 2, 3].includes(limite)) return { error: "Escolha 1, 2 ou 3 matérias ao mesmo tempo." };
  const payload = {
    nome,
    slug: slugify(slugInformado || nome),
    descricao,
    apresentacao,
    preco,
    preco_promocional: precoPromocional,
    promocao_ate: precoPromocional == null ? null : promocaoAte || null,
    peso_gramas: pesoGramas,
    comprimento_cm: comprimento,
    largura_cm: largura,
    altura_cm: altura,
    materias_simultaneas: limite,
    ativo,
    gratuita,
    para_todos: paraTodos,
    agrupador,
  };
  if (!payload.slug) return { error: "Não foi possível gerar o SKU do produto." };

  let ordem = 1;
  if (!id) {
    const { data: ultimo } = await supabase.from("produto").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle();
    ordem = Number(ultimo?.ordem ?? 0) + 1;
  }

  if (id) {
    const { error } = await supabase.from("produto").update(payload).eq("id", id);
    if (error) return { error: error.code === "23505" ? "Já existe um produto com este SKU." : dbMessage(error) };
    const sync = await sincronizarCategoriasDoProduto(supabase, id, categoriaIds);
    if ("error" in sync) return { error: sync.error };
    revalidatePath("/secretaria/produtos");
    revalidatePath(`/secretaria/produtos/${id}`);
    revalidatePath("/loja", "layout");
    revalidatePath("/meus-cursos", "layout");
    return { ok: "Produto atualizado." };
  }

  const { data: criado, error } = await supabase.from("produto").insert({ ...payload, ordem }).select("id").single();
  if (error || !criado) return { error: error ? (error.code === "23505" ? "Já existe um produto com este SKU." : dbMessage(error)) : "Não foi possível criar o produto." };
  const sync = await sincronizarCategoriasDoProduto(supabase, criado.id, categoriaIds);
  if ("error" in sync) return { error: sync.error };
  revalidatePath("/secretaria/produtos");
  revalidatePath("/loja", "layout");
  revalidatePath("/meus-cursos", "layout");
  redirect(`/secretaria/produtos/${criado.id}`);
}

export async function excluirProduto(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "").trim();
  const { data: produto } = await supabase.from("produto").select("nome").eq("id", id).maybeSingle();
  if (!produto) return { error: "Produto não encontrado." };
  if (confirmacao !== String(produto.nome).trim()) return { error: "Digite o nome do produto exatamente como está cadastrado." };

  const { error } = await supabase.from("produto").delete().eq("id", id);
  if (error) return { error: dbMessage(error) };
  revalidatePath("/secretaria/produtos");
  revalidatePath("/loja");
  redirect("/secretaria/produtos");
}

async function sincronizarCapaProduto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  produtoId: string
) {
  const { data: primeira } = await supabase
    .from("produto_imagem")
    .select("path, imagem_zoom, imagem_x, imagem_y")
    .eq("produto_id", produtoId)
    .order("ordem")
    .limit(1)
    .maybeSingle();
  await supabase
    .from("produto")
    .update({
      imagem_path: primeira?.path ?? null,
      imagem_zoom: primeira?.imagem_zoom ?? 1,
      imagem_x: primeira?.imagem_x ?? 0,
      imagem_y: primeira?.imagem_y ?? 0,
    })
    .eq("id", produtoId);
}

export async function salvarImagemProduto(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const produtoId = String(formData.get("produto_id") ?? "");
  const arquivo = formData.get("imagem");
  const imagem = arquivo instanceof File && arquivo.size > 0 ? arquivo : null;
  if (!id && !imagem) return { error: "Escolha uma imagem." };
  if (imagem && !imagem.type.startsWith("image/")) return { error: "A imagem precisa ser JPG, PNG ou WebP." };
  if (imagem && imagem.size > 8 * 1024 * 1024) return { error: "A imagem pode ter até 8 MB." };

  let path: string | null = null;
  if (imagem) {
    const { admin, error: storageError } = await storageAdmin();
    if (!admin) return { error: storageError ?? "Upload indisponível." };
    const extensao = imagem.type === "image/png" ? "png" : imagem.type === "image/webp" ? "webp" : "jpg";
    path = `${produtoId}/${Date.now()}.${extensao}`;
    const { error: uploadError } = await admin.storage.from("produtos").upload(path, Buffer.from(await imagem.arrayBuffer()), {
      contentType: imagem.type,
      upsert: true,
    });
    if (uploadError) return { error: uploadError.message };
  }

  const zoom = Math.min(3, Math.max(1, Number(formData.get("imagem_zoom") ?? 1) || 1));
  const x = Math.min(80, Math.max(-80, Number(formData.get("imagem_x") ?? 0) || 0));
  const y = Math.min(80, Math.max(-80, Number(formData.get("imagem_y") ?? 0) || 0));
  const enquadramento = { imagem_zoom: zoom, imagem_x: x, imagem_y: y };

  if (id) {
    const { error } = await supabase
      .from("produto_imagem")
      .update(path ? { ...enquadramento, path } : enquadramento)
      .eq("id", id);
    if (error) return { error: dbMessage(error) };
  } else if (path) {
    const { count } = await supabase.from("produto_imagem").select("id", { count: "exact", head: true }).eq("produto_id", produtoId);
    const { error } = await supabase.from("produto_imagem").insert({
      produto_id: produtoId,
      path,
      ordem: (count ?? 0) + 1,
      ...enquadramento,
    });
    if (error) return { error: dbMessage(error) };
  } else {
    return { error: "Escolha uma imagem." };
  }

  await sincronizarCapaProduto(supabase, produtoId);
  revalidatePath(`/secretaria/produtos/${produtoId}`);
  revalidatePath("/loja", "layout");
  revalidatePath("/meus-cursos", "layout");
  return { ok: id ? "Imagem atualizada." : "Imagem adicionada." };
}

export async function excluirImagemProduto(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const produtoId = String(formData.get("produto_id") ?? "");
  const { error } = await supabase.from("produto_imagem").delete().eq("id", id);
  if (error) return { error: dbMessage(error) };
  await sincronizarCapaProduto(supabase, produtoId);
  revalidatePath(`/secretaria/produtos/${produtoId}`);
  revalidatePath("/loja", "layout");
  revalidatePath("/meus-cursos", "layout");
  return { ok: "Imagem removida." };
}

export async function salvarInfoProduto(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const produtoId = String(formData.get("produto_id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const valor = String(formData.get("valor") ?? "").trim();
  const ordem = Number(formData.get("ordem") ?? 1);
  if (!nome) return { error: "Informe o nome do campo." };
  const payload = { nome, valor, ordem };
  const { error } = id
    ? await supabase.from("produto_info").update(payload).eq("id", id)
    : await supabase.from("produto_info").insert({ ...payload, produto_id: produtoId });
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/produtos/${produtoId}`);
  revalidatePath("/loja", "layout");
  return { ok: id ? "Informação atualizada." : "Informação adicionada." };
}

export async function excluirInfoProduto(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const produtoId = String(formData.get("produto_id") ?? "");
  const { error } = await supabase.from("produto_info").delete().eq("id", id);
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/produtos/${produtoId}`);
  revalidatePath("/loja", "layout");
  return { ok: "Informação removida." };
}

export async function salvarVariacao(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const produtoId = String(formData.get("produto_id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const preco = Number(formData.get("preco") ?? 0);
  const ordem = Number(formData.get("ordem") ?? 1);
  if (!nome) return { error: "Informe o nome da opção." };
  if (!Number.isFinite(preco) || preco < 0) return { error: "Informe um preço válido." };
  const { error } = await supabase.from("produto_variacao").insert({
    produto_id: produtoId,
    nome,
    preco,
    ordem,
  });
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/produtos/${produtoId}`);
  return { ok: "Opção adicionada." };
}

export async function excluirVariacao(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const produtoId = String(formData.get("produto_id") ?? "");
  const { error } = await supabase.from("produto_variacao").delete().eq("id", id);
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/produtos/${produtoId}`);
  return { ok: "Opção excluída." };
}

export async function salvarUsuarioInterno(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const admin = createServiceRoleClient();
  if (!admin) return { error: "Configure a service role para criar usuários internos." };

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const papel = String(formData.get("papel") ?? "secretaria");
  if (!nome || !email.includes("@")) return { error: "Informe nome e e-mail." };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (papel !== "admin" && papel !== "secretaria") return { error: "Papel inválido." };

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !created.user) return { error: "Não foi possível criar o usuário. O e-mail pode já existir." };

  const { error: insertError } = await admin.from("usuario_interno").insert({
    id: created.user.id,
    nome,
    email,
    papel,
  });
  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: insertError.message };
  }
  revalidatePath("/secretaria/usuarios-internos");
  return { ok: "Usuário interno criado." };
}
