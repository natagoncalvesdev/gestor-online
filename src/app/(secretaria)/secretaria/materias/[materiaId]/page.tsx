import { notFound } from "next/navigation";
import { excluirAula, excluirQuestao, salvarAula, salvarMateria, salvarQuestao } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";

export default async function MateriaDetalhePage({
  params,
}: {
  params: Promise<{ materiaId: string }>;
}) {
  await requireAdmin();
  const { materiaId } = await params;
  const supabase = await createClient();
  const { data: materia } = await supabase.from("materia").select("*").eq("id", materiaId).maybeSingle();
  if (!materia) notFound();

  const [{ data: aulas }, { data: questoes }] = await Promise.all([
    supabase
      .from("aula")
      .select("id, titulo, ordem, bunny_video_id, epub_path, epub_nome")
      .eq("materia_id", materiaId)
      .order("ordem"),
    supabase
      .from("questao")
      .select("id, enunciado, ordem, alternativas:alternativa(id, texto, correta, ordem)")
      .eq("materia_id", materiaId)
      .order("ordem"),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold">{materia.nome}</h1>
      <ActionForm action={salvarMateria} className="grid max-w-xl gap-4">
        <input type="hidden" name="id" value={materia.id} />
        <Field label="Nome">
          <Input name="nome" defaultValue={materia.nome} required />
        </Field>
        <Field label="Código">
          <Input name="codigo" defaultValue={materia.codigo} required />
        </Field>
        <Field label="Descrição">
          <Textarea name="descricao" defaultValue={materia.descricao} />
        </Field>
        <Field label="Carga horária">
          <Input name="carga_horaria" type="number" min={0} defaultValue={materia.carga_horaria} />
        </Field>
        <Field label="Nota mínima da prova">
          <Input name="nota_minima" type="number" min={0} max={10} step="0.1" defaultValue={materia.nota_minima} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={materia.ativo} />
          Matéria ativa
        </label>
        <SubmitButton>Salvar matéria</SubmitButton>
      </ActionForm>

      <section className="max-w-xl space-y-2">
        <h2 className="text-lg font-semibold">Aulas</h2>
        <p className="text-sm text-muted-foreground">{aulas?.length ?? 0} {aulas?.length === 1 ? "aula" : "aulas"}. Abra uma linha para editar.</p>
        {(aulas ?? []).map((aula) => (
          <details key={aula.id} className="rounded-xl border bg-card">
            <summary className="flex cursor-pointer items-center px-4 py-3 text-sm font-medium">
              <span className="min-w-0 flex-1 truncate">{aula.ordem}. {aula.titulo}</span>
            </summary>
            <div className="space-y-3 border-t px-4 py-4">
              <ActionForm action={salvarAula} className="grid gap-3">
                <input type="hidden" name="id" value={aula.id} />
                <input type="hidden" name="materia_id" value={materia.id} />
                <Field label="Título">
                  <Input name="titulo" defaultValue={aula.titulo} required />
                </Field>
                <Field label="Ordem">
                  <Input name="ordem" type="number" min={1} defaultValue={aula.ordem} />
                </Field>
                <Field label="ID do vídeo no Bunny">
                  <Input name="bunny_video_id" defaultValue={aula.bunny_video_id ?? ""} />
                </Field>
                <Field label={aula.epub_nome ? `Substituir livro (${aula.epub_nome})` : "Livro digital EPUB"}>
                  <Input name="epub" type="file" accept=".epub" />
                </Field>
                <SubmitButton>Salvar aula</SubmitButton>
              </ActionForm>
              <ActionForm action={excluirAula}>
                <input type="hidden" name="id" value={aula.id} />
                <input type="hidden" name="materia_id" value={materia.id} />
                <input type="hidden" name="epub_path" value={aula.epub_path ?? ""} />
                <SubmitButton variant="ghost" pendingLabel="Excluindo...">
                  Excluir aula
                </SubmitButton>
              </ActionForm>
            </div>
          </details>
        ))}
        <details className="rounded-xl border border-dashed bg-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Nova aula</summary>
          <ActionForm action={salvarAula} className="grid gap-3 border-t px-4 py-4">
            <input type="hidden" name="materia_id" value={materia.id} />
            <Field label="Título">
              <Input name="titulo" required />
            </Field>
            <Field label="Ordem">
              <Input name="ordem" type="number" min={1} defaultValue={(aulas?.length ?? 0) + 1} />
            </Field>
            <Field label="ID do vídeo no Bunny">
              <Input name="bunny_video_id" />
            </Field>
            <Field label="Livro digital EPUB">
              <Input name="epub" type="file" accept=".epub" />
            </Field>
            <SubmitButton>Adicionar aula</SubmitButton>
          </ActionForm>
        </details>
      </section>

      <section className="max-w-xl space-y-2">
        <h2 className="text-lg font-semibold">Prova</h2>
        <p className="text-sm text-muted-foreground">{questoes?.length ?? 0} {questoes?.length === 1 ? "questão" : "questões"}. Abra uma linha para ver as alternativas.</p>
        {(questoes ?? []).map((questao) => {
          const alternativas = ((questao.alternativas ?? []) as { id: string; texto: string; correta: boolean; ordem: number }[])
            .slice()
            .sort((a, b) => a.ordem - b.ordem);
          return (
            <details key={questao.id} className="rounded-xl border bg-card">
              <summary className="flex cursor-pointer items-center px-4 py-3 text-sm font-medium">
                <span className="min-w-0 flex-1 truncate">{questao.ordem}. {questao.enunciado}</span>
              </summary>
              <div className="space-y-3 border-t px-4 py-4">
                <ul className="space-y-1 text-sm">
                  {alternativas.map((alternativa) => (
                    <li key={alternativa.id}>
                      {alternativa.texto}
                      {alternativa.correta ? " · correta" : ""}
                    </li>
                  ))}
                </ul>
                <ActionForm action={excluirQuestao}>
                  <input type="hidden" name="id" value={questao.id} />
                  <input type="hidden" name="materia_id" value={materia.id} />
                  <SubmitButton variant="ghost">Excluir questão</SubmitButton>
                </ActionForm>
              </div>
            </details>
          );
        })}
        <details className="rounded-xl border border-dashed bg-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Nova questão</summary>
          <ActionForm action={salvarQuestao} className="grid gap-3 border-t px-4 py-4">
            <input type="hidden" name="materia_id" value={materia.id} />
            <Field label="Ordem">
              <Input name="ordem" type="number" min={1} defaultValue={(questoes?.length ?? 0) + 1} />
            </Field>
            <Field label="Enunciado">
              <Textarea name="enunciado" required />
            </Field>
            {[1, 2, 3, 4].map((numero) => (
              <Field key={numero} label={`Alternativa ${numero}`}>
                <Input name={`alt_${numero}`} />
              </Field>
            ))}
            <Field label="Alternativa correta">
              <select name="correta" className="h-10 w-full rounded-md border bg-white px-3 text-sm" defaultValue="1">
                <option value="1">Alternativa 1</option>
                <option value="2">Alternativa 2</option>
                <option value="3">Alternativa 3</option>
                <option value="4">Alternativa 4</option>
              </select>
            </Field>
            <SubmitButton>Adicionar questão</SubmitButton>
          </ActionForm>
        </details>
      </section>
    </div>
  );
}
