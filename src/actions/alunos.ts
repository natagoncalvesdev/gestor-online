"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireAluno, requireAdmin, requireInterno } from "@/lib/session";
import { enderecosDoForm } from "@/lib/aluno-endereco";
import { cpfOnlyDigits, formatCpfDisplay, isValidCpf } from "@/lib/cpf";
import type { FormState } from "@/lib/form-state";
import { um } from "@/lib/relacao";

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

  const { data: produto } = await supabase.from("produto").select("agrupador").eq("id", produtoId).maybeSingle();
  if (produto?.agrupador) return { error: "Use “Adicionar sequência” para produtos agrupadores." };

  const { data, error } = await supabase.rpc("criar_matricula", {
    p_aluno_id: alunoId,
    p_produto_id: produtoId,
    p_origem: "manual",
    p_pedido_id: null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/secretaria/alunos/${alunoId}`);
  const payload = data as { criada?: boolean; motivo?: string } | null;
  if (payload?.motivo === "sem_materias") return { error: "Este produto não tem matérias vinculadas." };
  const criada = Boolean(payload?.criada);
  return criada
    ? { ok: "Aluno matriculado. As matérias deste produto foram vinculadas." }
    : { error: "O aluno já está matriculado neste produto." };
}

export async function matricularMateria(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireInterno();
  const supabase = await createClient();
  const alunoId = String(formData.get("aluno_id") ?? "");
  const opcao = String(formData.get("materia_opcao") ?? "");
  const [produtoId, materiaId] = opcao.split("|");
  if (!produtoId || !materiaId) return { error: "Escolha a matéria." };

  const { data, error } = await supabase.rpc("matricular_materia_aluno", {
    p_aluno_id: alunoId,
    p_produto_id: produtoId,
    p_materia_id: materiaId,
  });
  if (error) return { error: error.message };
  const payload = data as { ok?: boolean; motivo?: string } | null;
  if (payload?.motivo === "produto_agrupador") {
    return { error: "Use Adicionar sequência para produtos agrupadores." };
  }
  if (payload?.motivo === "materia_invalida") return { error: "Matéria não pertence a este produto." };
  if (payload?.motivo === "ja_matriculada") return { error: "O aluno já está matriculado nesta matéria." };
  if (!payload?.ok) return { error: "Não foi possível matricular a matéria." };

  revalidatePath(`/secretaria/alunos/${alunoId}`);
  revalidatePath("/meus-cursos", "layout");
  return { ok: "Matéria matriculada." };
}

export async function matricularSequencia(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireInterno();
  const supabase = await createClient();
  const alunoId = String(formData.get("aluno_id") ?? "");
  const produtoId = String(formData.get("produto_id") ?? "");
  if (!produtoId) return { error: "Escolha a sequência." };

  const { data: produto, error: erroProduto } = await supabase
    .from("produto")
    .select("agrupador, nome")
    .eq("id", produtoId)
    .maybeSingle();
  if (erroProduto) return { error: erroProduto.message };
  if (!produto?.agrupador) return { error: "O produto escolhido não é uma sequência (agrupador)." };

  const { count, error: erroMaterias } = await supabase
    .from("produto_materia")
    .select("materia_id", { count: "exact", head: true })
    .eq("produto_id", produtoId);
  if (erroMaterias) return { error: erroMaterias.message };
  if ((count ?? 0) === 0) return { error: "Esta sequência não tem matérias vinculadas. Cadastre as matérias no produto." };

  const { data, error } = await supabase.rpc("criar_matricula", {
    p_aluno_id: alunoId,
    p_produto_id: produtoId,
    p_origem: "manual",
    p_pedido_id: null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/secretaria/alunos/${alunoId}`);
  const payload = data as { criada?: boolean; motivo?: string } | null;
  if (payload?.motivo === "sem_materias") return { error: "Esta sequência não tem matérias vinculadas." };
  const criada = Boolean(payload?.criada);
  return criada
    ? { ok: "Sequência matriculada. As matérias foram vinculadas ao aluno." }
    : { error: "O aluno já está matriculado nesta sequência." };
}

export async function removerSequencia(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireInterno();
  const supabase = await createClient();
  const alunoId = String(formData.get("aluno_id") ?? "");
  const matriculaId = String(formData.get("matricula_id") ?? "");
  if (!matriculaId) return { error: "Matrícula não encontrada." };

  const { data: matricula, error: erroMatricula } = await supabase
    .from("matricula")
    .select("id, status, produto:produto_id(agrupador)")
    .eq("id", matriculaId)
    .eq("aluno_id", alunoId)
    .maybeSingle();
  if (erroMatricula) return { error: erroMatricula.message };
  if (!matricula || matricula.status === "cancelada") return { error: "Matrícula não encontrada." };

  const produto = um(matricula.produto as { agrupador: boolean } | { agrupador: boolean }[] | null);
  if (!produto?.agrupador) return { error: "Esta matrícula não é uma sequência (produto agrupador)." };

  const { data: materias, error: erroMaterias } = await supabase
    .from("matricula_materia")
    .select("id, status")
    .eq("matricula_id", matriculaId);
  if (erroMaterias) return { error: erroMaterias.message };

  for (const linha of materias ?? []) {
    if (linha.status === "desmatriculada") continue;
    const { data, error } = await supabase.rpc("desmatricular_materia_matricula", {
      p_aluno_id: alunoId,
      p_matricula_materia_id: linha.id,
    });
    if (error) return { error: error.message };
    const payload = data as { ok?: boolean; motivo?: string } | null;
    if (payload?.motivo === "ja_desmatriculada") continue;
    if (!payload?.ok) return { error: "Não foi possível desmatricular uma das matérias da sequência." };
  }

  const { data: matriculaDepois } = await supabase.from("matricula").select("status").eq("id", matriculaId).maybeSingle();
  if (matriculaDepois?.status !== "cancelada") {
    const { error } = await supabase.rpc("desmatricular_matricula", {
      p_matricula_id: matriculaId,
      p_aluno_id: alunoId,
    });
    if (error) return { error: error.message };
  }

  revalidatePath(`/secretaria/alunos/${alunoId}`);
  revalidatePath("/meus-cursos", "layout");
  return { ok: "Sequência removida. As matérias foram desmatriculadas." };
}

export async function concluirMateriaMatricula(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireInterno();
  const supabase = await createClient();
  const alunoId = String(formData.get("aluno_id") ?? "");
  const matriculaMateriaId = String(formData.get("matricula_materia_id") ?? "");
  if (!matriculaMateriaId) return { error: "Matéria não encontrada." };

  const { data, error } = await supabase.rpc("concluir_materia_matricula", {
    p_aluno_id: alunoId,
    p_matricula_materia_id: matriculaMateriaId,
  });
  if (error) return { error: error.message };
  const payload = data as { ok?: boolean; motivo?: string } | null;
  if (payload?.motivo === "nao_encontrada") return { error: "Matrícula ou matéria não encontrada." };
  if (payload?.motivo === "nao_liberada") return { error: "Só é possível concluir matérias liberadas." };
  if (!payload?.ok) return { error: "Não foi possível concluir a matéria." };

  revalidatePath(`/secretaria/alunos/${alunoId}`);
  revalidatePath("/meus-cursos", "layout");
  return { ok: "Matéria concluída. A próxima na fila foi liberada, se houver vaga." };
}

export async function desmatricularMateriaMatricula(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireInterno();
  const supabase = await createClient();
  const alunoId = String(formData.get("aluno_id") ?? "");
  const matriculaMateriaId = String(formData.get("matricula_materia_id") ?? "");
  if (!matriculaMateriaId) return { error: "Matéria não encontrada." };

  const { data, error } = await supabase.rpc("desmatricular_materia_matricula", {
    p_aluno_id: alunoId,
    p_matricula_materia_id: matriculaMateriaId,
  });
  if (error) return { error: error.message };
  const payload = data as { ok?: boolean; motivo?: string; removida?: boolean; matricula_cancelada?: boolean } | null;
  if (payload?.motivo === "nao_encontrada") return { error: "Matrícula ou matéria não encontrada." };
  if (payload?.motivo === "ja_desmatriculada") return { error: "Esta matéria já está desmatriculada." };
  if (!payload?.ok) return { error: "Não foi possível desmatricular a matéria." };

  revalidatePath(`/secretaria/alunos/${alunoId}`);
  revalidatePath("/meus-cursos", "layout");
  if (payload.removida) {
    return {
      ok: payload.matricula_cancelada
        ? "Matéria removida. A matrícula no produto foi cancelada por não haver outras matérias."
        : "Matéria removida.",
    };
  }
  return { ok: "Matéria encerrada (desmatriculada)." };
}

export async function reiniciarMateriaMatricula(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireInterno();
  const supabase = await createClient();
  const alunoId = String(formData.get("aluno_id") ?? "");
  const matriculaMateriaId = String(formData.get("matricula_materia_id") ?? "");
  if (!matriculaMateriaId) return { error: "Matéria não encontrada." };

  const { data, error } = await supabase.rpc("reiniciar_materia_matricula", {
    p_aluno_id: alunoId,
    p_matricula_materia_id: matriculaMateriaId,
  });
  if (error) return { error: error.message };
  const payload = data as { ok?: boolean; motivo?: string; status?: string } | null;
  if (payload?.motivo === "nao_encontrada") return { error: "Matéria não encontrada ou não pode ser reiniciada." };
  if (!payload?.ok) return { error: "Não foi possível reiniciar a matéria." };

  revalidatePath(`/secretaria/alunos/${alunoId}`);
  revalidatePath("/meus-cursos", "layout");
  return { ok: "Matéria reiniciada. O progresso foi zerado." };
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
    .select("id, ordem, status")
    .eq("matricula_id", matriculaId)
    .order("ordem");
  const listaMaterias = materias ?? [];
  const ativas = listaMaterias.filter((item) => item.status !== "desmatriculada");
  const idsLiberar = new Set(ativas.slice(0, limite).map((item) => item.id));
  for (const materia of listaMaterias) {
    if (materia.status === "desmatriculada") continue;
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

export async function alterarDataMatricula(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const alunoId = String(formData.get("aluno_id") ?? "");
  const matriculaId = String(formData.get("matricula_id") ?? "");
  const informada = String(formData.get("data_matricula") ?? "").trim();
  if (!matriculaId) return { error: "Matrícula não encontrada." };
  if (!informada) return { error: "Informe a data e hora." };
  const data = new Date(informada);
  if (Number.isNaN(data.getTime())) return { error: "Informe uma data e hora válidas." };

  const { data: matricula } = await supabase
    .from("matricula")
    .select("id")
    .eq("id", matriculaId)
    .eq("aluno_id", alunoId)
    .maybeSingle();
  if (!matricula) return { error: "Matrícula não encontrada." };

  const { error } = await supabase.rpc("alterar_data_matricula", {
    p_matricula_id: matriculaId,
    p_data: data.toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath(`/secretaria/alunos/${alunoId}`);
  revalidatePath("/meus-cursos", "layout");
  return { ok: "Data da matrícula atualizada." };
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
