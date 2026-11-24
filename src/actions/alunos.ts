"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireAluno, requireInterno } from "@/lib/session";
import { cpfOnlyDigits, formatCpfDisplay, isValidCpf } from "@/lib/cpf";
import type { FormState } from "@/lib/form-state";

function dbMessage(error: { code?: string; message: string }) {
  if (error.code === "23505") return "Já existe um registro com estes dados.";
  return error.message;
}

export async function atualizarAluno(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireInterno();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const cpf = formatCpfDisplay(cpfOnlyDigits(String(formData.get("cpf") ?? "")));
  const dataNascimento = String(formData.get("data_nascimento") ?? "");
  const telefone = String(formData.get("telefone") ?? "").trim();
  const numeroAluno = String(formData.get("numero_aluno") ?? "").trim();
  const status = String(formData.get("status") ?? "ativo");

  if (nome.length < 5) return { error: "Informe o nome completo." };
  if (!isValidCpf(cpfOnlyDigits(cpf))) return { error: "CPF inválido." };
  if (!dataNascimento) return { error: "Informe a data de nascimento." };
  if (!numeroAluno) return { error: "Informe o número do aluno." };

  const { error } = await supabase
    .from("aluno")
    .update({
      nome,
      cpf,
      data_nascimento: dataNascimento,
      telefone,
      numero_aluno: numeroAluno,
      cep: String(formData.get("cep") ?? "").trim(),
      logradouro: String(formData.get("logradouro") ?? "").trim(),
      numero: String(formData.get("numero") ?? "").trim(),
      complemento: String(formData.get("complemento") ?? "").trim(),
      bairro: String(formData.get("bairro") ?? "").trim(),
      cidade: String(formData.get("cidade") ?? "").trim(),
      uf: String(formData.get("uf") ?? ""),
      status: status === "inativo" ? "inativo" : "ativo",
    })
    .eq("id", id);

  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/alunos/${id}`);
  revalidatePath("/secretaria/alunos");
  return { ok: "Cadastro atualizado." };
}

export async function atualizarPerfil(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAluno();
  const supabase = await createClient();
  const { error } = await supabase
    .from("aluno")
    .update({
      telefone: String(formData.get("telefone") ?? "").trim(),
      cep: String(formData.get("cep") ?? "").trim(),
      logradouro: String(formData.get("logradouro") ?? "").trim(),
      numero: String(formData.get("numero") ?? "").trim(),
      complemento: String(formData.get("complemento") ?? "").trim(),
      bairro: String(formData.get("bairro") ?? "").trim(),
      cidade: String(formData.get("cidade") ?? "").trim(),
      uf: String(formData.get("uf") ?? ""),
    })
    .eq("id", session.user.id);
  if (error) return { error: dbMessage(error) };
  revalidatePath("/perfil");
  return { ok: "Perfil atualizado." };
}

export async function matricularCurso(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireInterno();
  const supabase = await createClient();
  const alunoId = String(formData.get("aluno_id") ?? "");
  const cursoId = String(formData.get("curso_id") ?? "");
  if (!cursoId) return { error: "Escolha o curso." };

  const { data, error } = await supabase.rpc("criar_matricula", {
    p_aluno_id: alunoId,
    p_curso_id: cursoId,
    p_origem: "manual",
    p_pedido_id: null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/secretaria/alunos/${alunoId}`);
  const criada = Boolean((data as { criada?: boolean } | null)?.criada);
  return criada
    ? { ok: "Aluno matriculado. As primeiras matérias foram liberadas." }
    : { error: "O aluno já está matriculado neste curso." };
}

export async function liberarMateria(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireInterno();
  const supabase = await createClient();
  const alunoId = String(formData.get("aluno_id") ?? "");
  const cursoId = String(formData.get("curso_id") ?? "");
  const materiaId = String(formData.get("materia_id") ?? "");
  if (!cursoId || !materiaId) return { error: "Escolha o curso e a matéria." };

  const { data, error } = await supabase.rpc("liberar_materia", {
    p_aluno_id: alunoId,
    p_curso_id: cursoId,
    p_materia_id: materiaId,
  });
  if (error) return { error: error.message };
  revalidatePath(`/secretaria/alunos/${alunoId}`);
  const liberada = Boolean((data as { liberada?: boolean } | null)?.liberada);
  return liberada
    ? { ok: "Matéria liberada." }
    : { ok: "A matéria já estava liberada ou concluída." };
}

export async function salvarDocumento(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireInterno();
  const admin = createServiceRoleClient();
  if (!admin) return { error: "Configure a service role para anexar documentos." };

  const alunoId = String(formData.get("aluno_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "").trim();
  const informacao = String(formData.get("informacao") ?? "").trim();
  const codigo = String(formData.get("codigo") ?? "").trim();
  const dataEmissao = String(formData.get("data_emissao") ?? "");
  const file = formData.get("arquivo");

  if (!tipo) return { error: "Informe o tipo do documento." };

  let arquivoPath: string | null = null;
  let arquivoNome: string | null = null;
  if (file instanceof File && file.size > 0) {
    const id = crypto.randomUUID();
    const seguro = file.name.replace(/[^\w.\-]+/g, "_");
    arquivoPath = `${alunoId}/${id}-${seguro}`;
    arquivoNome = file.name;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage.from("documentos").upload(arquivoPath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (uploadError) return { error: uploadError.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("documento_emitido").insert({
    aluno_id: alunoId,
    tipo,
    informacao,
    codigo,
    arquivo_path: arquivoPath,
    arquivo_nome: arquivoNome,
    data_emissao: dataEmissao || new Date().toISOString().slice(0, 10),
  });
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/alunos/${alunoId}`);
  return { ok: "Documento registrado." };
}

export async function excluirDocumento(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireInterno();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const alunoId = String(formData.get("aluno_id") ?? "");
  const path = String(formData.get("arquivo_path") ?? "");
  const { error } = await supabase.from("documento_emitido").delete().eq("id", id);
  if (error) return { error: dbMessage(error) };
  if (path) {
    const admin = createServiceRoleClient();
    await admin?.storage.from("documentos").remove([path]);
  }
  revalidatePath(`/secretaria/alunos/${alunoId}`);
  return { ok: "Documento excluído." };
}
