import { notFound } from "next/navigation";
import { criarAula, excluirQuestao, salvarMateria, salvarQuestao, salvarTopico } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { EscolaDominicalAdmin, type LicaoAdmin } from "@/components/secretaria/escola-dominical-admin";
import { campoDataHora } from "@/lib/ebd";
import { SequenciaAulas } from "@/components/secretaria/sequencia-aulas";
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

  const [{ data: aulas }, { data: questoes }, { data: licoes }, { data: topicos }] = await Promise.all([
    supabase
      .from("aula")
      .select("id, titulo, ordem, bunny_video_id, youtube_id, epub_path, epub_nome, topico_id, libera_em, posicao")
      .eq("materia_id", materiaId)
      .order("ordem"),
    supabase
      .from("questao")
      .select("id, enunciado, ordem, alternativas:alternativa(id, texto, correta, ordem)")
      .eq("materia_id", materiaId)
      .order("ordem"),
    supabase
      .from("ebd_licao")
      .select("id, ordem, titulo, youtube_url, pdf_exibir_path, libera_em, anexos:ebd_anexo(id, nome)")
      .eq("materia_id", materiaId)
      .order("ordem"),
    supabase.from("aula_topico").select("id, titulo, ordem, posicao").eq("materia_id", materiaId).order("posicao"),
  ]);
  const aulaIds = (aulas ?? []).map((aula) => aula.id);
  const { data: arquivos } = aulaIds.length
    ? await supabase.from("aula_arquivo").select("id, aula_id, nome, visualizar, baixar").in("aula_id", aulaIds)
    : { data: [] };

  const sequencia = [
    ...(topicos ?? []).map((topico) => ({ tipo: "topico" as const, posicao: Number(topico.posicao ?? topico.ordem), topico })),
    ...(aulas ?? []).map((aula) => ({ tipo: "aula" as const, posicao: Number(aula.posicao ?? aula.ordem), aula })),
  ].sort((a, b) => a.posicao - b.posicao);

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
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="gratuita" defaultChecked={materia.gratuita} />
          Matéria gratuita
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="para_todos" defaultChecked={materia.para_todos} />
          Disponibilizar para todos os alunos
        </label>
        <SubmitButton>Salvar matéria</SubmitButton>
      </ActionForm>
      <EscolaDominicalAdmin
        materiaId={materia.id}
        licoes={((licoes ?? []) as LicaoAdmin[]).map((licao) => ({ ...licao, anexos: licao.anexos ?? [] }))}
      />

      <section className="max-w-3xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Tópicos e aulas</h2>
          <div className="flex gap-2">
            <ActionForm action={salvarTopico}>
              <input type="hidden" name="materia_id" value={materia.id} />
              <SubmitButton size="sm">Novo tópico</SubmitButton>
            </ActionForm>
            <ActionForm action={criarAula}>
              <input type="hidden" name="materia_id" value={materia.id} />
              <SubmitButton size="sm" variant="outline">Nova aula</SubmitButton>
            </ActionForm>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Arraste para mudar a posição. A aula fica no tópico que estiver acima dela.</p>
        <SequenciaAulas
          materiaId={materia.id}
          itens={sequencia.map((item) =>
            item.tipo === "topico"
              ? { tipo: "topico", id: item.topico.id, titulo: item.topico.titulo }
              : {
                  tipo: "aula",
                  id: item.aula.id,
                  titulo: item.aula.titulo,
                  ordem: item.aula.ordem,
                  video: item.aula.youtube_id ? `https://youtu.be/${item.aula.youtube_id}` : item.aula.bunny_video_id ?? "",
                  liberaEm: campoDataHora(item.aula.libera_em),
                  epubNome: item.aula.epub_nome,
                  epubPath: item.aula.epub_path,
                  arquivos: (arquivos ?? []).filter((arquivo) => arquivo.aula_id === item.aula.id),
                }
          )}
        />
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
