"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/session";
import type { FormState } from "@/lib/form-state";

function dbMessage(error: { message: string }) {
  return error.message;
}

function enquadramento(formData: FormData) {
  return {
    imagem_zoom: Math.min(3, Math.max(1, Number(formData.get("imagem_zoom") ?? 1) || 1)),
    imagem_x: Math.min(80, Math.max(-80, Number(formData.get("imagem_x") ?? 0) || 0)),
    imagem_y: Math.min(80, Math.max(-80, Number(formData.get("imagem_y") ?? 0) || 0)),
  };
}

async function enviarImagem(formData: FormData, pasta: string) {
  const imagem = formData.get("imagem");
  if (!(imagem instanceof File) || imagem.size === 0) return { error: "Escolha uma imagem." as const };
  if (!imagem.type.startsWith("image/")) return { error: "A imagem precisa ser JPG, PNG ou WebP." as const };
  if (imagem.size > 8 * 1024 * 1024) return { error: "A imagem pode ter até 8 MB." as const };
  const admin = createServiceRoleClient();
  if (!admin) return { error: "Configure a service role para enviar arquivos." as const };
  const extensao = imagem.type === "image/png" ? "png" : imagem.type === "image/webp" ? "webp" : "jpg";
  const path = `${pasta}/${Date.now()}.${extensao}`;
  const { error } = await admin.storage.from("site").upload(path, Buffer.from(await imagem.arrayBuffer()), {
    contentType: imagem.type,
    upsert: true,
  });
  if (error) return { error: error.message as string };
  return { path };
}

function atualizar() {
  revalidatePath("/");
  revalidatePath("/secretaria/pagina-inicial");
}

async function gravarIntegracao(campos: { google_api_key?: string; google_place_id?: string; instagram_token?: string }): Promise<FormState> {
  const admin = createServiceRoleClient();
  if (!admin) return { error: "Configure a service role para guardar os tokens." };
  const { data: atual } = await admin.from("home_integracao").select("google_api_key, google_place_id, instagram_token").eq("id", 1).maybeSingle();
  const { error } = await admin.from("home_integracao").upsert({
    id: 1,
    google_api_key: campos.google_api_key?.trim() || atual?.google_api_key || "",
    google_place_id: campos.google_place_id !== undefined ? campos.google_place_id.trim() : atual?.google_place_id || "",
    instagram_token: campos.instagram_token?.trim() || atual?.instagram_token || "",
  });
  if (error) return { error: dbMessage(error) };
  atualizar();
  return { ok: "Credencial salva. A página inicial passa a consultar a API." };
}

export async function salvarGoogle(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const lugar = String(formData.get("google_place_id") ?? "").trim();
  const chave = String(formData.get("google_api_key") ?? "").trim();
  if (!lugar) return { error: "Informe o Place ID do Google." };
  if (!chave) {
    const admin = createServiceRoleClient();
    const { data } = (await admin?.from("home_integracao").select("google_api_key").eq("id", 1).maybeSingle()) ?? { data: null };
    if (!data?.google_api_key) return { error: "Informe a chave da API do Google." };
  }
  return gravarIntegracao({ google_api_key: chave, google_place_id: lugar });
}

export async function salvarTokenInstagram(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const token = String(formData.get("instagram_token") ?? "").trim();
  if (!token) {
    const admin = createServiceRoleClient();
    const { data } = (await admin?.from("home_integracao").select("instagram_token").eq("id", 1).maybeSingle()) ?? { data: null };
    if (!data?.instagram_token) return { error: "Informe o token do Instagram." };
    return { ok: "O token já salvo foi mantido." };
  }
  return gravarIntegracao({ instagram_token: token });
}

export async function salvarBanner(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const envio = await enviarImagem(formData, "banners");
  if ("error" in envio) return { error: envio.error };
  const supabase = await createClient();
  const { count } = await supabase.from("home_banner").select("id", { count: "exact", head: true });
  const { error } = await supabase.from("home_banner").insert({
    imagem_path: envio.path,
    link: String(formData.get("link") ?? "").trim(),
    ordem: (count ?? 0) + 1,
    ...enquadramento(formData),
  });
  if (error) return { error: dbMessage(error) };
  atualizar();
  return { ok: "Banner adicionado. Ele já entra na sequência da página inicial." };
}

export async function editarBanner(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Banner não encontrado." };
  const supabase = await createClient();
  const payload: {
    link: string;
    imagem_zoom: number;
    imagem_x: number;
    imagem_y: number;
    imagem_path?: string;
  } = {
    link: String(formData.get("link") ?? "").trim(),
    ...enquadramento(formData),
  };
  const imagem = formData.get("imagem");
  if (imagem instanceof File && imagem.size > 0) {
    const envio = await enviarImagem(formData, "banners");
    if ("error" in envio) return { error: envio.error };
    payload.imagem_path = envio.path;
  }
  const { error } = await supabase.from("home_banner").update(payload).eq("id", id);
  if (error) return { error: dbMessage(error) };
  atualizar();
  return { ok: "Banner atualizado." };
}

export async function excluirBanner(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("home_banner").delete().eq("id", String(formData.get("id") ?? ""));
  if (error) return { error: dbMessage(error) };
  atualizar();
  return { ok: "Banner removido." };
}

export async function moverBanner(_prev: FormState, formData: FormData): Promise<FormState> {
  return mover("home_banner", formData);
}

export async function moverAvaliacao(_prev: FormState, formData: FormData): Promise<FormState> {
  return mover("home_avaliacao", formData);
}

export async function moverInstagram(_prev: FormState, formData: FormData): Promise<FormState> {
  return mover("home_instagram", formData);
}

export async function salvarAvaliacaoConfig(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const nota = Number(formData.get("nota") ?? 5);
  if (Number.isNaN(nota) || nota < 1 || nota > 5) return { error: "A nota fica entre 1 e 5." };
  const supabase = await createClient();
  const { error } = await supabase.from("home_avaliacao_config").upsert({
    id: 1,
    titulo: String(formData.get("titulo") ?? "").trim() || "O que falam sobre o CETADEB",
    nota,
    resumo: String(formData.get("resumo") ?? "").trim(),
    link: String(formData.get("link") ?? "").trim(),
  });
  if (error) return { error: dbMessage(error) };
  atualizar();
  return { ok: "Resumo do Google atualizado." };
}

export async function salvarAvaliacao(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const autor = String(formData.get("autor") ?? "").trim();
  const texto = String(formData.get("texto") ?? "").trim();
  const estrelas = Number(formData.get("estrelas") ?? 5);
  if (!autor || !texto) return { error: "Informe o nome e o texto da avaliação." };
  if (!Number.isInteger(estrelas) || estrelas < 1 || estrelas > 5) return { error: "As estrelas ficam entre 1 e 5." };
  const supabase = await createClient();
  const { count } = await supabase.from("home_avaliacao").select("id", { count: "exact", head: true });
  const { error } = await supabase.from("home_avaliacao").insert({
    autor,
    texto,
    estrelas,
    ordem: (count ?? 0) + 1,
  });
  if (error) return { error: dbMessage(error) };
  atualizar();
  return { ok: "Avaliação adicionada." };
}

export async function excluirAvaliacao(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("home_avaliacao").delete().eq("id", String(formData.get("id") ?? ""));
  if (error) return { error: dbMessage(error) };
  atualizar();
  return { ok: "Avaliação removida." };
}

export async function salvarInstagram(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const envio = await enviarImagem(formData, "instagram");
  if ("error" in envio) return { error: envio.error };
  const supabase = await createClient();
  const { count } = await supabase.from("home_instagram").select("id", { count: "exact", head: true });
  const { error } = await supabase.from("home_instagram").insert({
    imagem_path: envio.path,
    link: String(formData.get("link") ?? "").trim(),
    ordem: (count ?? 0) + 1,
    ...enquadramento(formData),
  });
  if (error) return { error: dbMessage(error) };
  atualizar();
  return { ok: "Publicação adicionada." };
}

export async function excluirInstagram(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("home_instagram").delete().eq("id", String(formData.get("id") ?? ""));
  if (error) return { error: dbMessage(error) };
  atualizar();
  return { ok: "Publicação removida." };
}

async function mover(tabela: "home_banner" | "home_instagram" | "home_avaliacao", formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const direcao = String(formData.get("direcao") ?? "");
  const supabase = await createClient();
  const { data } = await supabase.from(tabela).select("id, ordem").order("ordem");
  const lista = data ?? [];
  const indice = lista.findIndex((item) => item.id === id);
  const vizinho = direcao === "subir" ? indice - 1 : indice + 1;
  if (indice < 0 || vizinho < 0 || vizinho >= lista.length) return { ok: "A ordem já está no limite." };
  const atual = lista[indice];
  const outro = lista[vizinho];
  const { error: erroA } = await supabase.from(tabela).update({ ordem: outro.ordem }).eq("id", atual.id);
  if (erroA) return { error: dbMessage(erroA) };
  const { error: erroB } = await supabase.from(tabela).update({ ordem: atual.ordem }).eq("id", outro.id);
  if (erroB) return { error: dbMessage(erroB) };
  atualizar();
  return { ok: "Ordem atualizada." };
}
