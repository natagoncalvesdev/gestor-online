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
        <Field label="Carga horária">
          <Input name="carga_horaria" type="number" min={0} defaultValue={0} />
        </Field>
        <Field label="Nota mínima da prova">
          <Input name="nota_minima" type="number" min={0} max={10} step="0.1" defaultValue={7} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked />
          Matéria ativa
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="gratuita" />
          Matéria gratuita
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="para_todos" />
          Disponibilizar para todos os alunos
        </label>
        <SubmitButton>Criar matéria</SubmitButton>
      </ActionForm>
    </div>
  );
}
