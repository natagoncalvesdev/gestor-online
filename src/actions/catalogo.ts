"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/session";
import { slugify } from "@/lib/slug";
import type { FormState } from "@/lib/form-state";

function dbMessage(error: { code?: string; message: string }) {
  if (error.code === "23505") return "Já existe um registro com estes dados.";
  if (error.code === "23503") return "Este produto já tem matrícula e não pode ser excluído.";
  return error.message;
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
  const ativo = formData.get("ativo") === "on";

  if (!nome || !codigo) return { error: "Informe o nome e o código da matéria." };
  if (Number.isNaN(nota) || nota < 0 || nota > 10) return { error: "A nota mínima fica entre 0 e 10." };

  const payload = {
    nome,
    codigo,
    descricao,
    carga_horaria: Number.isFinite(carga) ? carga : 0,
    nota_minima: nota,
    ativo,
  };

  let ordem = 1;
  if (!id) {
    const { data: ultima } = await supabase.from("materia").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle();
    ordem = Number(ultima?.ordem ?? 0) + 1;
  }
  const { error } = id
    ? await supabase.from("materia").update(payload).eq("id", id)
    : await supabase.from("materia").insert({ ...payload, ordem });

  if (error) return { error: dbMessage(error) };
  revalidatePath("/secretaria/materias");
  return { ok: id ? "Matéria atualizada." : "Matéria criada." };
}

export async function salvarAula(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const materiaId = String(formData.get("materia_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const ordem = Number(formData.get("ordem") ?? 1);
  const bunny = String(formData.get("bunny_video_id") ?? "").trim();
  const file = formData.get("epub");

  if (!titulo || !materiaId) return { error: "Informe o título da aula." };
  if (!Number.isFinite(ordem) || ordem < 1) return { error: "A ordem começa em 1." };

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
      ordem,
      bunny_video_id: bunny || null,
      epub_path: epubPath,
      epub_nome: epubNome,
    };
    const { error: saveError } = id
      ? await supabase.from("aula").update(payload).eq("id", id)
      : await supabase.from("aula").insert(payload);
    if (saveError) return { error: dbMessage(saveError) };
  } else {
    const payload = {
      materia_id: materiaId,
      titulo,
      ordem,
      bunny_video_id: bunny || null,
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
  const { error } = await supabase.from("aula").delete().eq("id", id);
  if (error) return { error: dbMessage(error) };
  if (epubPath) {
    const admin = createServiceRoleClient();
    await admin?.storage.from("ebooks").remove([epubPath]);
  }
  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "Aula excluída." };
}

export async function salvarQuestao(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const materiaId = String(formData.get("materia_id") ?? "");
  const enunciado = String(formData.get("enunciado") ?? "").trim();
  const ordem = Number(formData.get("ordem") ?? 1);
  const correta = String(formData.get("correta") ?? "");

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
    .insert({ materia_id: materiaId, enunciado, ordem })
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
  const preco = Number(formData.get("preco") ?? 0);
  const promocionalInformado = String(formData.get("preco_promocional") ?? "").trim();
  const promocaoAte = String(formData.get("promocao_ate") ?? "").trim();
  const pesoGramas = Number(formData.get("peso_gramas") ?? 0);
  const comprimento = Number(formData.get("comprimento_cm") ?? 0);
  const largura = Number(formData.get("largura_cm") ?? 0);
  const altura = Number(formData.get("altura_cm") ?? 0);
  const limite = Number(formData.get("materias_simultaneas") ?? 1);
  const ativo = formData.get("ativo") === "on";
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
    preco,
    preco_promocional: precoPromocional,
    promocao_ate: precoPromocional == null ? null : promocaoAte || null,
    peso_gramas: pesoGramas,
    comprimento_cm: comprimento,
    largura_cm: largura,
    altura_cm: altura,
    materias_simultaneas: limite,
    ativo,
  };
  if (!payload.slug) return { error: "Não foi possível gerar o endereço do produto." };

  let ordem = 1;
  if (!id) {
    const { data: ultimo } = await supabase.from("produto").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle();
    ordem = Number(ultimo?.ordem ?? 0) + 1;
  }
  const { error } = id
    ? await supabase.from("produto").update(payload).eq("id", id)
    : await supabase.from("produto").insert({ ...payload, ordem });
  if (error) return { error: dbMessage(error) };
  revalidatePath("/secretaria/produtos");
  revalidatePath("/loja");
  return { ok: id ? "Produto atualizado." : "Produto criado." };
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
