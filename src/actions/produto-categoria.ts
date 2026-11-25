"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";
import { slugify } from "@/lib/slug";
import type { FormState } from "@/lib/form-state";
import type { ProdutoCategoriaLinha } from "@/lib/produto-categoria";
import { profundidadeCategoria } from "@/lib/produto-categoria";

function dbMessage(error: { code?: string; message: string }) {
  if (error.code === "23505") return "Já existe uma categoria com este endereço (slug).";
  if (error.code === "23503") return "Não é possível excluir: há produtos ou subcategorias vinculados.";
  return error.message;
}

async function validarPai(supabase: Awaited<ReturnType<typeof createClient>>, paiId: string | null, proprioId?: string) {
  if (!paiId) return null;
  if (proprioId && paiId === proprioId) return "A categoria pai não pode ser ela mesma.";
  const { data: pai } = await supabase.from("produto_categoria").select("id, sistema").eq("id", paiId).maybeSingle();
  if (!pai) return "Categoria pai não encontrada.";
  return null;
}

export async function listarCategoriasProdutoAdmin(): Promise<ProdutoCategoriaLinha[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("produto_categoria")
    .select("id, nome, slug, descricao, pai_id, ordem, ativo, sistema")
    .order("ordem");
  return (data ?? []) as ProdutoCategoriaLinha[];
}

export async function sincronizarCategoriasDoProduto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  produtoId: string,
  categoriaIds: string[],
) {
  const unicos = [...new Set(categoriaIds)];
  if (unicos.length === 0) return { error: "Selecione ao menos uma categoria para o produto." as const };

  const { data: existentes } = await supabase.from("produto_categoria").select("id").in("id", unicos);
  if ((existentes ?? []).length !== unicos.length) {
    return { error: "Uma ou mais categorias selecionadas não existem." as const };
  }

  const { error: apagar } = await supabase.from("produto_categoria_produto").delete().eq("produto_id", produtoId);
  if (apagar) return { error: dbMessage(apagar) as string };

  const { error: inserir } = await supabase.from("produto_categoria_produto").insert(
    unicos.map((categoria_id) => ({ produto_id: produtoId, categoria_id })),
  );
  if (inserir) return { error: dbMessage(inserir) as string };

  return { ok: true as const };
}

export async function salvarProdutoCategoria(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const slugInformado = String(formData.get("slug") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const paiIdBruto = String(formData.get("pai_id") ?? "").trim();
  const paiId = paiIdBruto === "" ? null : paiIdBruto;
  const ativo = formData.get("ativo") === "on";

  if (!nome) return { error: "Informe o nome da categoria." };
  const slug = slugify(slugInformado || nome);
  if (!slug) return { error: "Não foi possível gerar o endereço da categoria." };

  const erroPai = await validarPai(supabase, paiId, id || undefined);
  if (erroPai) return { error: erroPai };

  if (id) {
    const todas = await listarCategoriasProdutoAdmin();
    const profundidade = paiId ? profundidadeCategoria(todas, paiId) + 1 : 0;
    if (profundidade > 8) return { error: "A hierarquia permite no máximo 9 níveis (raiz + 8 filhos)." };

    const { data: atual } = await supabase
      .from("produto_categoria")
      .select("sistema")
      .eq("id", id)
      .maybeSingle();
    if (!atual) return { error: "Categoria não encontrada." };

    const updatePayload = atual.sistema
      ? { nome, descricao, pai_id: paiId, ativo }
      : { nome, slug, descricao, pai_id: paiId, ativo };

    const { error } = await supabase.from("produto_categoria").update(updatePayload).eq("id", id);
    if (error) return { error: dbMessage(error) };
    revalidatePath("/secretaria/produtos/categorias");
    revalidatePath(`/secretaria/produtos/categorias/${id}`);
    revalidatePath("/secretaria/produtos");
    revalidatePath("/loja", "layout");
    return { ok: "Categoria atualizada." };
  }

  const { data: irmaos } = await supabase
    .from("produto_categoria")
    .select("ordem")
    .is("pai_id", paiId)
    .order("ordem", { ascending: false })
    .limit(1);
  const ordem = Number(irmaos?.[0]?.ordem ?? 0) + 1;

  const { data: criada, error } = await supabase
    .from("produto_categoria")
    .insert({ nome, slug, descricao, pai_id: paiId, ordem, ativo, sistema: false })
    .select("id")
    .single();
  if (error || !criada) return { error: error ? dbMessage(error) : "Não foi possível criar a categoria." };
  revalidatePath("/secretaria/produtos/categorias");
  revalidatePath("/loja", "layout");
  redirect(`/secretaria/produtos/categorias/${criada.id}`);
}

export async function excluirProdutoCategoria(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "").trim();

  const { data: categoria } = await supabase
    .from("produto_categoria")
    .select("id, nome, sistema")
    .eq("id", id)
    .maybeSingle();
  if (!categoria) return { error: "Categoria não encontrada." };
  if (categoria.sistema) return { error: "Esta categoria do sistema não pode ser excluída." };
  if (confirmacao !== String(categoria.nome).trim()) {
    return { error: "Digite o nome da categoria exatamente como está cadastrado." };
  }

  const { count: filhos } = await supabase
    .from("produto_categoria")
    .select("id", { count: "exact", head: true })
    .eq("pai_id", id);
  if ((filhos ?? 0) > 0) return { error: "Exclua ou mova as subcategorias antes de remover esta categoria." };

  const { error } = await supabase.from("produto_categoria").delete().eq("id", id);
  if (error) return { error: dbMessage(error) };
  revalidatePath("/secretaria/produtos/categorias");
  revalidatePath("/secretaria/produtos");
  revalidatePath("/loja", "layout");
  redirect("/secretaria/produtos/categorias");
}

export async function reordenarProdutoCategorias(
  paiId: string | null,
  categoriaIds: string[],
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  if (paiId === null) return { error: "Categorias principais não podem ser reordenadas." };
  if (categoriaIds.length === 0) return { error: "Nenhuma categoria para reordenar." };
  const supabase = await createClient();
  for (let indice = 0; indice < categoriaIds.length; indice += 1) {
    let query = supabase.from("produto_categoria").update({ ordem: indice + 1 }).eq("id", categoriaIds[indice]);
    if (paiId === null) query = query.is("pai_id", null);
    else query = query.eq("pai_id", paiId);
    const { error } = await query;
    if (error) return { error: dbMessage(error) };
  }
  revalidatePath("/secretaria/produtos/categorias");
  revalidatePath("/loja", "layout");
  return { ok: true };
}