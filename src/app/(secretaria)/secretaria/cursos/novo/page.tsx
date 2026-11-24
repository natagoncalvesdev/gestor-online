import { salvarCurso } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { PageTitle } from "@/components/page-title";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { requireAdmin } from "@/lib/session";

export default async function NovoCursoPage() {
  await requireAdmin();
  return (
    <div>
      <PageTitle title="Novo curso" />
      <ActionForm action={salvarCurso} className="grid max-w-xl gap-4">
        <Field label="Nome">
          <Input name="nome" required />
        </Field>
        <Field label="Endereço (opcional)">
          <Input name="slug" placeholder="Deixe vazio para gerar pelo nome" />
        </Field>
        <Field label="Descrição">
          <Textarea name="descricao" />
        </Field>
        <Field label="Matérias abertas ao mesmo tempo">
          <Select name="materias_simultaneas" defaultValue="1">
            <option value="1">1 matéria por vez</option>
            <option value="2">2 matérias por vez</option>
            <option value="3">3 matérias por vez</option>
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked />
          Curso ativo
        </label>
        <SubmitButton>Criar curso</SubmitButton>
      </ActionForm>
    </div>
  );
}
