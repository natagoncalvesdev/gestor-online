import { notFound } from "next/navigation";
import { adicionarMateriaCurso, removerMateriaCurso, salvarCurso } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { lista, um } from "@/lib/relacao";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";

export default async function CursoDetalhePage({
  params,
}: {
  params: Promise<{ cursoId: string }>;
}) {
  await requireAdmin();
  const { cursoId } = await params;
  const supabase = await createClient();
  const [{ data: curso }, { data: materias }] = await Promise.all([
    supabase
      .from("curso")
      .select("id, nome, slug, descricao, materias_simultaneas, ativo, vinculos:curso_materia(ordem, materia:materia_id(id, nome))")
      .eq("id", cursoId)
      .maybeSingle(),
    supabase.from("materia").select("id, nome").eq("ativo", true).order("nome"),
  ]);
  if (!curso) notFound();

  const vinculos = lista(
    curso.vinculos as {
      ordem: number;
      materia: { id: string; nome: string } | { id: string; nome: string }[] | null;
    }[]
  )
    .map((linha) => ({ ordem: linha.ordem, materia: um(linha.materia) }))
    .filter((linha) => linha.materia)
    .sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{curso.nome}</h1>
      <ActionForm action={salvarCurso} className="grid max-w-xl gap-4">
        <input type="hidden" name="id" value={curso.id} />
        <Field label="Nome">
          <Input name="nome" defaultValue={curso.nome} required />
        </Field>
        <Field label="Endereço">
          <Input name="slug" defaultValue={curso.slug} />
        </Field>
        <Field label="Descrição">
          <Textarea name="descricao" defaultValue={curso.descricao} />
        </Field>
        <Field label="Matérias abertas ao mesmo tempo">
          <Select name="materias_simultaneas" defaultValue={String(curso.materias_simultaneas)}>
            <option value="1">1 matéria por vez</option>
            <option value="2">2 matérias por vez</option>
            <option value="3">3 matérias por vez</option>
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={curso.ativo} />
          Curso ativo
        </label>
        <SubmitButton>Salvar curso</SubmitButton>
      </ActionForm>

      <section>
        <h2 className="mb-3 font-semibold">Matérias do curso</h2>
        <ul className="space-y-2">
          {vinculos.map((linha) => (
            <li key={linha.materia!.id} className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
              <span>
                {linha.ordem}. {linha.materia!.nome}
              </span>
              <ActionForm action={removerMateriaCurso}>
                <input type="hidden" name="curso_id" value={curso.id} />
                <input type="hidden" name="materia_id" value={linha.materia!.id} />
                <SubmitButton variant="ghost">Remover</SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
        <ActionForm action={adicionarMateriaCurso} className="mt-4 grid max-w-xl gap-3">
          <input type="hidden" name="curso_id" value={curso.id} />
          <Field label="Matéria">
            <Select name="materia_id" defaultValue="">
              <option value="">Selecione a matéria</option>
              {(materias ?? []).map((materia) => (
                <option key={materia.id} value={materia.id}>
                  {materia.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ordem">
            <Input name="ordem" type="number" min={1} defaultValue={vinculos.length + 1} />
          </Field>
          <SubmitButton>Vincular matéria</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
