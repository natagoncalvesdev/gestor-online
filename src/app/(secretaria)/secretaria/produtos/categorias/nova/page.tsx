import Link from "next/link";
import { salvarProdutoCategoria } from "@/actions/produto-categoria";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ordenarCategoriasHierarquia, rotuloCategoriaComHierarquia, type ProdutoCategoriaLinha } from "@/lib/produto-categoria";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";

export default async function NovaCategoriaProdutoPage({
  searchParams,
}: {
  searchParams: Promise<{ pai?: string }>;
}) {
  await requireAdmin();
  const { pai: paiPreferido } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("produto_categoria")
    .select("id, nome, slug, descricao, pai_id, ordem, ativo, sistema")
    .order("ordem");
  const linhas = ordenarCategoriasHierarquia((data ?? []) as ProdutoCategoriaLinha[]);

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Nova categoria</h1>
        <Link href="/secretaria/produtos/categorias" className="inline-flex h-8 items-center rounded-md border bg-white px-3 text-xs font-medium hover:bg-secondary">
          Voltar
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={salvarProdutoCategoria} className="grid gap-4">
            <Field label="Nome">
              <Input name="nome" required />
            </Field>
            <Field label="Categoria pai">
              <Select name="pai_id" defaultValue={paiPreferido ?? ""}>
                <option value="">Nenhuma (categoria principal)</option>
                {linhas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {rotuloCategoriaComHierarquia(item.nome, item.profundidade)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Descrição">
              <Textarea name="descricao" rows={3} />
            </Field>
            <Field label="Slug">
              <Input name="slug" placeholder="Gerado a partir do nome se vazio" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="ativo" defaultChecked className="size-4 accent-primary" />
              Categoria ativa
            </label>
            <SubmitButton>Criar categoria</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}