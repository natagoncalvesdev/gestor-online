import { notFound } from "next/navigation";
import { excluirVariacao, salvarProduto, salvarVariacao } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { formatBRL } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";

export default async function ProdutoDetalhePage({
  params,
}: {
  params: Promise<{ produtoId: string }>;
}) {
  await requireAdmin();
  const { produtoId } = await params;
  const supabase = await createClient();
  const [{ data: produto }, { data: cursos }] = await Promise.all([
    supabase
      .from("produto")
      .select("id, nome, slug, descricao, preco, curso_id, ativo, variacoes:produto_variacao(id, nome, preco, ordem, ativo)")
      .eq("id", produtoId)
      .maybeSingle(),
    supabase.from("curso").select("id, nome").order("nome"),
  ]);
  if (!produto) notFound();

  const variacoes = ((produto.variacoes ?? []) as { id: string; nome: string; preco: number; ordem: number; ativo: boolean }[])
    .slice()
    .sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{produto.nome}</h1>
      <ActionForm action={salvarProduto} className="grid max-w-xl gap-4">
        <input type="hidden" name="id" value={produto.id} />
        <Field label="Nome">
          <Input name="nome" defaultValue={produto.nome} required />
        </Field>
        <Field label="Endereço">
          <Input name="slug" defaultValue={produto.slug} />
        </Field>
        <Field label="Descrição">
          <Textarea name="descricao" defaultValue={produto.descricao} />
        </Field>
        <Field label="Preço (R$)">
          <Input name="preco" type="number" min={0} step="0.01" defaultValue={produto.preco} required />
        </Field>
        <Field label="Curso">
          <Select name="curso_id" defaultValue={produto.curso_id ?? ""}>
            <option value="">Nenhum — produto avulso</option>
            {(cursos ?? []).map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.nome}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={produto.ativo} />
          Produto ativo
        </label>
        <SubmitButton>Salvar produto</SubmitButton>
      </ActionForm>

      <section>
        <h2 className="mb-3 font-semibold">Opções de preço</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Se houver opções, o aluno escolhe uma. Todas liberam o mesmo curso do produto, ou nenhum.
        </p>
        <ul className="space-y-2">
          {variacoes.map((variacao) => (
            <li key={variacao.id} className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
              <span>
                {variacao.nome} — {formatBRL(variacao.preco)}
              </span>
              <ActionForm action={excluirVariacao}>
                <input type="hidden" name="id" value={variacao.id} />
                <input type="hidden" name="produto_id" value={produto.id} />
                <SubmitButton variant="ghost">Excluir</SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
        <ActionForm action={salvarVariacao} className="mt-4 grid max-w-xl gap-3">
          <input type="hidden" name="produto_id" value={produto.id} />
          <Field label="Nome da opção">
            <Input name="nome" required placeholder="À vista, 10x..." />
          </Field>
          <Field label="Preço (R$)">
            <Input name="preco" type="number" min={0} step="0.01" required />
          </Field>
          <Field label="Ordem">
            <Input name="ordem" type="number" min={1} defaultValue={variacoes.length + 1} />
          </Field>
          <SubmitButton>Adicionar opção</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
