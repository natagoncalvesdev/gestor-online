"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { horarioBrasilia } from "@/lib/ebd";
import { requireAdmin } from "@/lib/session";
import type { FormState } from "@/lib/form-state";

async function enviarPdf(arquivo: File, pasta: string) {
  if (arquivo.type !== "application/pdf") return { error: "Envie um arquivo PDF." as const };
  if (arquivo.size > 20 * 1024 * 1024) return { error: "O PDF pode ter até 20 MB." as const };
  const admin = createServiceRoleClient();
  if (!admin) return { error: "Configure a service role para enviar arquivos." as const };
  const path = `${pasta}/${Date.now()}.pdf`;
  const { error } = await admin.storage.from("ebd").upload(path, Buffer.from(await arquivo.arrayBuffer()), {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) return { error: error.message };
  return { path };
}

export async function adicionarLicao(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const materiaId = String(formData.get("materia_id") ?? "");
  const supabase = await createClient();
  const { data: ultima } = await supabase.from("ebd_licao").select("ordem").eq("materia_id", materiaId).order("ordem", { ascending: false }).limit(1).maybeSingle();
  const ordem = Number(ultima?.ordem ?? 0) + 1;
  const { error } = await supabase.from("ebd_licao").insert({
    materia_id: materiaId,
    ordem,
    titulo: `Lição ${ordem}`,
  });
  if (error) return { error: error.message };
  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "Lição adicionada." };
}

export async function garantirLicoesEscola(materiaId: string) {
  const supabase = await createClient();
  const { count } = await supabase.from("ebd_licao").select("id", { count: "exact", head: true }).eq("materia_id", materiaId);
  if ((count ?? 0) > 0) return;
  const linhas = Array.from({ length: 13 }, (_, indice) => ({
    materia_id: materiaId,
    ordem: indice + 1,
    titulo: `Lição ${indice + 1}`,
  }));
  await supabase.from("ebd_licao").insert(linhas);
}

export async function salvarLicao(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const materiaId = String(formData.get("materia_id") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return { error: "Informe o título da lição." };
  const supabase = await createClient();
  const payload: { titulo: string; youtube_url: string; libera_em: string | null; pdf_exibir_path?: string } = {
    titulo,
    youtube_url: String(formData.get("youtube_url") ?? "").trim(),
    libera_em: horarioBrasilia(String(formData.get("libera_em") ?? "")),
  };
  const pdf = formData.get("pdf_exibir");
  if (pdf instanceof File && pdf.size > 0) {
    const envio = await enviarPdf(pdf, `${materiaId}/${id}`);
    if ("error" in envio) return { error: envio.error };
    payload.pdf_exibir_path = envio.path;
  }
  const { error } = await supabase.from("ebd_licao").update(payload).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/secretaria/materias/${materiaId}`);
  revalidatePath("/meus-cursos", "layout");
  return { ok: "Lição salva." };
}

export async function salvarAnexoLicao(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const licaoId = String(formData.get("licao_id") ?? "");
  const materiaId = String(formData.get("materia_id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const arquivo = formData.get("arquivo");
  if (!nome) return { error: "Informe o nome do PDF para download." };
  if (!(arquivo instanceof File) || arquivo.size === 0) return { error: "Escolha o PDF para download." };
  const envio = await enviarPdf(arquivo, `${materiaId}/${licaoId}/anexos`);
  if ("error" in envio) return { error: envio.error };
  const supabase = await createClient();
  const { error } = await supabase.from("ebd_anexo").insert({ licao_id: licaoId, nome, path: envio.path });
  if (error) return { error: error.message };
  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "PDF de download adicionado." };
}

export async function excluirAnexoLicao(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const materiaId = String(formData.get("materia_id") ?? "");
  const { error } = await supabase.from("ebd_anexo").delete().eq("id", String(formData.get("id") ?? ""));
  if (error) return { error: error.message };
  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "PDF removido." };
}

export async function clonarLicao(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const materiaId = String(formData.get("materia_id") ?? "");
  const { data: licao } = await supabase.from("ebd_licao").select("titulo, youtube_url, pdf_exibir_path, libera_em").eq("id", id).maybeSingle();
  if (!licao) return { error: "Lição não encontrada." };
  const { data: ultima } = await supabase.from("ebd_licao").select("ordem").eq("materia_id", materiaId).order("ordem", { ascending: false }).limit(1).maybeSingle();
  const { data: copia, error } = await supabase
    .from("ebd_licao")
    .insert({
      materia_id: materiaId,
      ordem: Number(ultima?.ordem ?? 0) + 1,
      titulo: `${licao.titulo} (cópia)`,
      youtube_url: licao.youtube_url,
      pdf_exibir_path: licao.pdf_exibir_path,
      libera_em: licao.libera_em,
    })
    .select("id")
    .single();
  if (error || !copia) return { error: error?.message ?? "Não foi possível clonar a lição." };
  const { data: anexos } = await supabase.from("ebd_anexo").select("nome, path").eq("licao_id", id);
  if (anexos?.length) {
    await supabase.from("ebd_anexo").insert(anexos.map((anexo) => ({ licao_id: copia.id, nome: anexo.nome, path: anexo.path })));
  }
  revalidatePath(`/secretaria/materias/${materiaId}`);
  return { ok: "Lição clonada." };
}
