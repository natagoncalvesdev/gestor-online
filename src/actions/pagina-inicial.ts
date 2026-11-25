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
  return moverBanners(formData);
}

async function moverBanners(formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const direcao = String(formData.get("direcao") ?? "");
  const supabase = await createClient();
  const { data } = await supabase.from("home_banner").select("id, ordem").order("ordem");
  const lista = data ?? [];
  const indice = lista.findIndex((item) => item.id === id);
  const vizinho = direcao === "subir" ? indice - 1 : indice + 1;
  if (indice < 0 || vizinho < 0 || vizinho >= lista.length) return { ok: "A ordem já está no limite." };
  const atual = lista[indice];
  const outro = lista[vizinho];
  const { error: erroA } = await supabase.from("home_banner").update({ ordem: outro.ordem }).eq("id", atual.id);
  if (erroA) return { error: dbMessage(erroA) };
  const { error: erroB } = await supabase.from("home_banner").update({ ordem: atual.ordem }).eq("id", outro.id);
  if (erroB) return { error: dbMessage(erroB) };
  atualizar();
  return { ok: "Ordem atualizada." };
}
