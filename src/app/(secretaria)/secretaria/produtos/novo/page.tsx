import { salvarProduto } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { PageTitle } from "@/components/page-title";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";

export default async function NovoProdutoPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: cursos } = await supabase.from("curso").select("id, nome").eq("ativo", true).order("nome");

  return (
    <div>
      <PageTitle title="Novo produto" />
      <ActionForm action={salvarProduto} className="grid max-w-xl gap-4">
        <Field label="Nome">
          <Input name="nome" required />
        </Field>
        <Field label="Endereço (opcional)">
          <Input name="slug" />
        </Field>
        <Field label="Descrição">
          <Textarea name="descricao" />
        </Field>
        <Field label="Preço (R$)">
          <Input name="preco" type="number" min={0} step="0.01" required />
        </Field>
        <Field label="Curso">
          <Select name="curso_id" defaultValue="">
            <option value="">Nenhum — produto avulso</option>
            {(cursos ?? []).map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.nome}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked />
          Produto ativo
        </label>
        <SubmitButton>Criar produto</SubmitButton>
      </ActionForm>
    </div>
  );
}
