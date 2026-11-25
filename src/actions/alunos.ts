"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireAluno, requireInterno } from "@/lib/session";
import { enderecosDoForm } from "@/lib/aluno-endereco";
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
      atendente: String(formData.get("atendente") ?? "").trim(),
      indicador: String(formData.get("indicador") ?? "").trim(),
      status: status === "inativo" ? "inativo" : "ativo",
    })
    .eq("id", id);

  if (error) return { error: dbMessage(error) };

  const { error: erroEndereco } = await supabase
    .from("endereco_aluno")
    .upsert(enderecosDoForm(formData, id), { onConflict: "aluno_id,finalidade" });
  if (erroEndereco) return { error: dbMessage(erroEndereco) };
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
    })
    .eq("id", session.user.id);
  if (error) return { error: dbMessage(error) };

  const { error: erroEndereco } = await supabase
    .from("endereco_aluno")
    .upsert(enderecosDoForm(formData, session.user.id), { onConflict: "aluno_id,finalidade" });
  if (erroEndereco) return { error: dbMessage(erroEndereco) };
  revalidatePath("/perfil");
  return { ok: "Perfil atualizado." };
}

export async function matricularCurso(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireInterno();
  const supabase = await createClient();
  const alunoId = String(formData.get("aluno_id") ?? "");
  const produtoId = String(formData.get("produto_id") ?? "");
  if (!produtoId) return { error: "Escolha o produto." };

  const { data, error } = await supabase.rpc("criar_matricula", {
    p_aluno_id: alunoId,
    p_produto_id: produtoId,
    p_origem: "manual",
    p_pedido_id: null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/secretaria/alunos/${alunoId}`);
  const criada = Boolean((data as { criada?: boolean } | null)?.criada);
  return criada
    ? { ok: "Aluno matriculado. As primeiras matérias foram liberadas." }
    : { error: "O aluno já está matriculado neste produto." };
}

export async function concluirMatricula(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireInterno();
  const supabase = await createClient();
  const alunoId = String(formData.get("aluno_id") ?? "");
  const matriculaId = String(formData.get("matricula_id") ?? "");
  const { error } = await supabase
    .from("matricula")
    .update({ status: "concluida" })
    .eq("id", matriculaId)
    .eq("aluno_id", alunoId)
    .eq("status", "ativa");
  if (error) return { error: error.message };
  revalidatePath(`/secretaria/alunos/${alunoId}`);
  return { ok: "Matrícula concluída." };
}

export async function desmatricularMatricula(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireInterno();
  const supabase = await createClient();
  const alunoId = String(formData.get("aluno_id") ?? "");
  const matriculaId = String(formData.get("matricula_id") ?? "");
  const { error } = await supabase
    .from("matricula")
    .update({ status: "cancelada" })
    .eq("id", matriculaId)
    .eq("aluno_id", alunoId)
    .neq("status", "cancelada");
  if (error) return { error: error.message };
  revalidatePath(`/secretaria/alunos/${alunoId}`);
  return { ok: "Aluno desmatriculado deste curso." };
}

export async function reiniciarMatricula(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireInterno();
  const supabase = await createClient();
  const alunoId = String(formData.get("aluno_id") ?? "");
  const matriculaId = String(formData.get("matricula_id") ?? "");
  const { data: matricula } = await supabase
    .from("matricula")
    .select("id, produto_id, status")
    .eq("id", matriculaId)
    .eq("aluno_id", alunoId)
    .maybeSingle();
  if (!matricula) return { error: "Matrícula não encontrada." };
  if (matricula.status !== "concluida") return { error: "Só é possível reiniciar matrícula encerrada." };

  const { data: produto } = await supabase.from("produto").select("materias_simultaneas").eq("id", matricula.produto_id).maybeSingle();
  const limite = Math.max(1, Number(produto?.materias_simultaneas ?? 1));

  const { error: erroStatus } = await supabase.from("matricula").update({ status: "ativa" }).eq("id", matriculaId);
  if (erroStatus) return { error: erroStatus.message };

  const { data: materias } = await supabase
    .from("matricula_materia")
    .select("id, ordem")
    .eq("matricula_id", matriculaId)
    .order("ordem");
  const listaMaterias = materias ?? [];
  const idsLiberar = new Set(listaMaterias.slice(0, limite).map((item) => item.id));
  for (const materia of listaMaterias) {
    const liberada = idsLiberar.has(materia.id);
    const { error } = await supabase
      .from("matricula_materia")
      .update({
        status: liberada ? "liberada" : "bloqueada",
        liberada_em: liberada ? new Date().toISOString() : null,
        concluida_em: null,
      })
      .eq("id", materia.id);
    if (error) return { error: error.message };
  }

  revalidatePath(`/secretaria/alunos/${alunoId}`);
  return { ok: "Matrícula reiniciada." };
}

export async function liberarMateria(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireInterno();
  const supabase = await createClient();
  const alunoId = String(formData.get("aluno_id") ?? "");
  const produtoId = String(formData.get("produto_id") ?? "");
  const materiaId = String(formData.get("materia_id") ?? "");
  if (!produtoId || !materiaId) return { error: "Escolha o produto e a matéria." };

  const { data, error } = await supabase.rpc("liberar_materia", {
    p_aluno_id: alunoId,
    p_produto_id: produtoId,
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

export async function salvarObservacao(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireInterno();
  const alunoId = String(formData.get("aluno_id") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return { error: "Escreva a observação." };
  const supabase = await createClient();
  const { error } = await supabase.from("observacao_aluno").insert({
    aluno_id: alunoId,
    texto,
    autor_nome: session.user.nome,
  });
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/alunos/${alunoId}`);
  return { ok: "Observação adicionada." };
}

export async function destacarObservacao(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireInterno();
  const id = String(formData.get("id") ?? "");
  const alunoId = String(formData.get("aluno_id") ?? "");
  const destaque = String(formData.get("destaque") ?? "") === "1";
  const supabase = await createClient();
  const { error } = await supabase.from("observacao_aluno").update({ destaque: !destaque }).eq("id", id);
  if (error) return { error: dbMessage(error) };
  revalidatePath(`/secretaria/alunos/${alunoId}`);
  return null;
}
