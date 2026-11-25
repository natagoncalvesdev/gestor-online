import { notFound } from "next/navigation";
import { criarAula, salvarMateria, salvarTopico } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
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

  const [{ data: aulas }, { data: questoes }, { data: secoes }, { data: questionarios }] = await Promise.all([
    supabase
      .from("aula")
      .select("id, titulo, ordem, conteudo, bunny_video_id, youtube_id, epub_path, epub_nome, libera_em, posicao")
      .eq("materia_id", materiaId)
      .order("posicao"),
    supabase
      .from("questao")
      .select("id, enunciado, ordem, questionario_id, alternativas:alternativa(id, texto, correta, ordem)")
      .eq("materia_id", materiaId)
      .order("ordem"),
    supabase.from("aula_topico").select("id, titulo, ordem, posicao").eq("materia_id", materiaId).order("posicao"),
    supabase.from("questionario").select("id, aula_id, titulo, posicao, nota_minima, encerra_materia").eq("materia_id", materiaId).order("posicao"),
  ]);
  const aulaIds = (aulas ?? []).map((aula) => aula.id);
  const [{ data: arquivos }, { data: topicosAula }] = await Promise.all([
    aulaIds.length
      ? supabase.from("aula_arquivo").select("id, aula_id, topico_id, nome, visualizar, baixar").in("aula_id", aulaIds)
      : Promise.resolve({ data: [] as { id: string; aula_id: string; topico_id: string | null; nome: string; visualizar: boolean; baixar: boolean }[] }),
    aulaIds.length
      ? supabase.from("topico").select("id, aula_id, titulo, conteudo, posicao, bunny_video_id, youtube_id, epub_path, epub_nome, libera_em").in("aula_id", aulaIds).order("posicao")
      : Promise.resolve({ data: [] as { id: string; aula_id: string; titulo: string; conteudo: string; posicao: number; bunny_video_id: string | null; youtube_id: string | null; epub_path: string | null; epub_nome: string | null; libera_em: string | null }[] }),
  ]);

  const listaQuestoes = (questoes ?? []) as {
    id: string;
    enunciado: string;
    ordem: number;
    questionario_id: string | null;
    alternativas: { id: string; texto: string; correta: boolean; ordem: number }[] | null;
  }[];
  const quizzes = questionarios ?? [];
  const arquivosLista = arquivos ?? [];

  function videoDe(youtube: string | null, bunny: string | null) {
    return youtube ? `https://youtu.be/${youtube}` : bunny ?? "";
  }
  function questoesDe(questionarioId: string) {
    return listaQuestoes
      .filter((questao) => questao.questionario_id === questionarioId)
      .map((questao) => ({
        id: questao.id,
        enunciado: questao.enunciado,
        ordem: questao.ordem,
        alternativas: (questao.alternativas ?? []).slice().sort((a, b) => a.ordem - b.ordem),
      }));
  }

  const raiz = [
    ...(secoes ?? []).map((secao) => ({ tipo: "secao" as const, posicao: Number(secao.posicao ?? secao.ordem), secao })),
    ...(aulas ?? []).map((aula) => ({ tipo: "aula" as const, posicao: Number(aula.posicao ?? aula.ordem), aula })),
    ...quizzes.filter((quiz) => !quiz.aula_id).map((quiz) => ({ tipo: "questionario" as const, posicao: Number(quiz.posicao), quiz })),
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
        <div className="flex flex-wrap gap-4">
          <Field label="Carga horária">
            <Input name="carga_horaria" type="number" min={0} defaultValue={materia.carga_horaria} className="w-24" />
          </Field>
          <Field label="Nota mínima da prova">
            <Input name="nota_minima" type="number" min={0} max={10} step="0.1" defaultValue={materia.nota_minima} className="w-24" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={materia.ativo} />
          Matéria ativa
        </label>
        <SubmitButton>Salvar matéria</SubmitButton>
      </ActionForm>
      <section className="max-w-3xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Conteúdo</h2>
          <div className="flex gap-2">
            <ActionForm action={salvarTopico}>
              <input type="hidden" name="materia_id" value={materia.id} />
              <SubmitButton size="sm">Nova seção</SubmitButton>
            </ActionForm>
            <ActionForm action={criarAula}>
              <input type="hidden" name="materia_id" value={materia.id} />
              <SubmitButton size="sm" variant="outline">Nova aula</SubmitButton>
            </ActionForm>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Arraste para mudar a posição. A aula fica na seção que estiver acima dela. Tópicos e questionários ficam dentro da aula.</p>
        <SequenciaAulas
          materiaId={materia.id}
          itens={raiz.map((item) => {
            if (item.tipo === "secao") return { tipo: "secao", id: item.secao.id, titulo: item.secao.titulo };
            if (item.tipo === "questionario") {
              return {
                tipo: "questionario" as const,
                id: item.quiz.id,
                titulo: item.quiz.titulo,
                encerra: item.quiz.encerra_materia,
                notaMinima: item.quiz.nota_minima == null ? "" : String(item.quiz.nota_minima),
                questoes: questoesDe(item.quiz.id),
              };
            }
            return {
              tipo: "aula" as const,
              id: item.aula.id,
              titulo: item.aula.titulo,
              conteudo: item.aula.conteudo ?? "",
              video: videoDe(item.aula.youtube_id, item.aula.bunny_video_id),
              liberaEm: campoDataHora(item.aula.libera_em),
              epubNome: item.aula.epub_nome,
              epubPath: item.aula.epub_path,
              arquivos: arquivosLista.filter((arquivo) => arquivo.aula_id === item.aula.id && !arquivo.topico_id),
              topicos: (topicosAula ?? [])
                .filter((topico) => topico.aula_id === item.aula.id)
                .map((topico) => ({
                  id: topico.id,
                  titulo: topico.titulo,
                  conteudo: topico.conteudo ?? "",
                  video: videoDe(topico.youtube_id, topico.bunny_video_id),
                  liberaEm: campoDataHora(topico.libera_em),
                  epubNome: topico.epub_nome,
                  epubPath: topico.epub_path,
                  posicao: Number(topico.posicao),
                  arquivos: arquivosLista.filter((arquivo) => arquivo.topico_id === topico.id),
                })),
              questionarios: quizzes
                .filter((quiz) => quiz.aula_id === item.aula.id)
                .map((quiz) => ({
                  id: quiz.id,
                  titulo: quiz.titulo,
                  encerra: quiz.encerra_materia,
                  notaMinima: quiz.nota_minima == null ? "" : String(quiz.nota_minima),
                  posicao: Number(quiz.posicao),
                  questoes: questoesDe(quiz.id),
                })),
            };
          })}
        />
      </section>
    </div>
  );
}
