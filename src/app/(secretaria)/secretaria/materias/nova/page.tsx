import { salvarMateria } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { PageTitle } from "@/components/page-title";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { requireAdmin } from "@/lib/session";

export default async function NovaMateriaPage() {
  await requireAdmin();
  return (
    <div>
      <PageTitle title="Nova matéria" />
      <ActionForm action={salvarMateria} className="grid max-w-xl gap-4">
        <Field label="Nome">
          <Input name="nome" required />
        </Field>
        <Field label="Código">
          <Input name="codigo" required placeholder="TS1" />
        </Field>
        <Field label="Descrição">
          <Textarea name="descricao" />
        </Field>
        <div className="flex flex-wrap gap-4">
          <Field label="Carga horária">
            <Input name="carga_horaria" type="number" min={0} defaultValue={0} className="w-24" />
          </Field>
          <Field label="Nota mínima da prova">
            <Input name="nota_minima" type="number" min={0} max={10} step="0.1" defaultValue={7} className="w-24" />
          </Field>
          <Field label="Validade (dias)">
            <Input name="validade_dias" type="number" min={1} step={1} placeholder="Ex.: 90" className="w-24" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked />
          Matéria ativa
        </label>
        <SubmitButton>Criar matéria</SubmitButton>
      </ActionForm>
    </div>
  );
}
