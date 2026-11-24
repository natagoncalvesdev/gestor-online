import { salvarProduto } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { PageTitle } from "@/components/page-title";
import { SubmitButton } from "@/components/submit-button";
import { EditorApresentacao } from "@/components/secretaria/editor-apresentacao";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { requireAdmin } from "@/lib/session";

export default async function NovoProdutoPage() {
  await requireAdmin();

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
        <div>
          <p className="mb-1 text-sm font-medium">Descrição curta</p>
          <EditorApresentacao name="descricao" compacto dica="Aparece ao lado do preço na loja." />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium">Texto da loja e do curso</p>
          <EditorApresentacao />
        </div>
        <Field label="Preço (R$)">
          <Input name="preco" type="number" min={0} step="0.01" required />
        </Field>
        <Field label="Preço promocional (R$)">
          <Input name="preco_promocional" type="number" min={0} step="0.01" />
        </Field>
        <Field label="Promoção válida até">
          <Input name="promocao_ate" type="date" />
        </Field>
        <p className="-mt-2 text-sm text-muted-foreground">Deixe a data em branco para a promoção ficar valendo sem prazo.</p>
        <Field label="Peso (gramas)">
          <Input name="peso_gramas" type="number" min={0} step={1} defaultValue={0} required />
        </Field>
        <Field label="Comprimento (cm)">
          <Input name="comprimento_cm" type="number" min={0} step={1} defaultValue={0} />
        </Field>
        <Field label="Largura (cm)">
          <Input name="largura_cm" type="number" min={0} step={1} defaultValue={0} />
        </Field>
        <Field label="Altura (cm)">
          <Input name="altura_cm" type="number" min={0} step={1} defaultValue={0} />
        </Field>
        <Field label="Matérias abertas ao mesmo tempo">
          <Select name="materias_simultaneas" defaultValue="1">
            <option value="1">1 matéria por vez</option>
            <option value="2">2 matérias por vez</option>
            <option value="3">3 matérias por vez</option>
          </Select>
        </Field>
        <p className="text-sm text-muted-foreground">As matérias são escolhidas depois, na página do produto.</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked />
          Produto ativo
        </label>
        <SubmitButton>Criar produto</SubmitButton>
      </ActionForm>
    </div>
  );
}
