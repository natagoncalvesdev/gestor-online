import Link from "next/link";
import { notFound } from "next/navigation";
import { salvarProdutoCategoria } from "@/actions/produto-categoria";
import { ActionForm } from "@/components/action-form";
import { ExcluirProdutoCategoria } from "@/components/secretaria/excluir-produto-categoria";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  ordenarCategoriasHierarquia,
  rotuloCategoriaComHierarquia,
  type ProdutoCategoriaLinha,
} from "@/lib/produto-categoria";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";

export default async function CategoriaProdutoDetalhePage({
  params,
}: {
  params: Promise<{ categoriaId: string }>;
}) {
  await requireAdmin();
  const { categoriaId } = await params;
  const supabase = await createClient();
  const [{ data: categoria }, { data: todas }] = await Promise.all([
    supabase
      .from("produto_categoria")
      .select("id, nome, slug, descricao, pai_id, ordem, ativo, sistema")
      .eq("id", categoriaId)
      .maybeSingle(),
    supabase
      .from("produto_categoria")
      .select("id, nome, slug, descricao, pai_id, ordem, ativo, sistema")
      .order("ordem"),
  ]);
  if (!categoria) notFound();

  const linhas = ordenarCategoriasHierarquia((todas ?? []) as ProdutoCategoriaLinha[]).filter(
    (item) => item.id !== categoria.id,
  );
  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{categoria.nome}</h1>
          <p className="text-sm text-muted-foreground">Slug: {categoria.slug}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/secretaria/produtos/categorias/nova?pai=${categoria.id}`}
            className="inline-flex h-8 items-center rounded-md border bg-white px-3 text-xs font-medium hover:bg-secondary"
          >
            Nova subcategoria
          </Link>
          <Link href="/secretaria/produtos/categorias" className="inline-flex h-8 items-center rounded-md border bg-white px-3 text-xs font-medium hover:bg-secondary">
            Voltar à lista
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da categoria</CardTitle>
          <CardDescription>Alterações refletem na organização da loja e na vinculação dos produtos.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={salvarProdutoCategoria} className="grid gap-4">
            <input type="hidden" name="id" value={categoria.id} />
            <Field label="Nome">
              <Input name="nome" defaultValue={categoria.nome} required />
            </Field>
            <Field label="Categoria pai">
              <Select name="pai_id" defaultValue={categoria.pai_id ?? ""}>
                <option value="">Nenhuma (categoria principal)</option>
                {linhas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {rotuloCategoriaComHierarquia(item.nome, item.profundidade)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Descrição">
              <Textarea name="descricao" rows={3} defaultValue={categoria.descricao ?? ""} />
            </Field>
            <Field label="Slug">
              <Input
                name="slug"
                defaultValue={categoria.slug}
                disabled={categoria.sistema}
                title={categoria.sistema ? "Slug fixo em categorias do sistema" : undefined}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="ativo" defaultChecked={categoria.ativo} className="size-4 accent-primary" />
              Categoria ativa
            </label>
            <SubmitButton>Salvar alterações</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>

      <ExcluirProdutoCategoria id={categoria.id} nome={categoria.nome} sistema={categoria.sistema} />
    </div>
  );
}