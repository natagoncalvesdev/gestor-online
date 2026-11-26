import Link from "next/link";
import { salvarMateria } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { InterruptorForm } from "@/components/ui/interruptor";
import { requireAdmin } from "@/lib/session";

export default async function NovaMateriaPage() {
  await requireAdmin();
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Nova matéria</h1>
        <Link
          href="/secretaria/materias"
          className="inline-flex h-8 items-center justify-center rounded-md border bg-white px-3 text-xs font-medium hover:bg-secondary"
        >
          Voltar
        </Link>
      </div>

      <Card>
        <ActionForm action={salvarMateria} className="flex flex-col gap-4">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="grid gap-1">
              <CardTitle>Dados da matéria</CardTitle>
              <CardDescription>O slug identifica a matéria na matrícula e na prova.</CardDescription>
            </div>
            <InterruptorForm name="ativo" rotulo="Matéria ativa" defaultChecked />
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Nome">
              <Input name="nome" required placeholder="Ex.: Teologia básica" />
            </Field>
            <Field label="Slug">
              <Input name="slug" required placeholder="Ex.: teologia-basica" />
            </Field>
            <Field label="Descrição">
              <Textarea name="descricao" />
            </Field>
            <Field label="Carga horária">
              <Input name="carga_horaria" type="number" min={0} defaultValue={0} />
            </Field>
            <div className="grid grid-cols-4 gap-3">
              <Field label="Nota mínima da prova">
                <Input name="nota_minima" type="number" min={0} max={10} step="0.1" defaultValue={7} />
              </Field>
              <Field label="Questões na prova">
                <Input name="prova_quantidade" type="number" min={1} max={100} step={1} placeholder="Todas" />
              </Field>
              <Field label="Tempo (minutos)">
                <Input name="prova_duracao_minutos" type="number" min={5} max={240} step={1} defaultValue={60} required />
              </Field>
              <Field label="Validade (dias)">
                <Input name="validade_dias" type="number" min={1} step={1} placeholder="Ex.: 90" />
              </Field>
            </div>
            <SubmitButton className="w-full">Cadastrar</SubmitButton>
          </CardContent>
        </ActionForm>
      </Card>
    </div>
  );
}
