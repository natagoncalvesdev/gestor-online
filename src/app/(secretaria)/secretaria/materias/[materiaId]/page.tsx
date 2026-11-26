import Link from "next/link";
import { notFound } from "next/navigation";
import { criarAula, salvarMateria, salvarTopico } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { campoDataHora } from "@/lib/ebd";
import { SequenciaAulas } from "@/components/secretaria/sequencia-aulas";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { InterruptorForm } from "@/components/ui/interruptor";
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

  const [{ data: aulas }, questoesConsulta, { data: secoes }, { data: questionarios }] = await Promise.all([
    supabase
      .from("aula")
      .select("id, titulo, ordem, conteudo, bunny_video_id, youtube_id, epub_path, epub_nome, libera_em, posicao")
      .eq("materia_id", materiaId)
      .order("posicao"),
    supabase
      .from("questao")
      .select("id, enunciado, ordem, ativo, questionario_id, alternativas:alternativa(id, texto, correta, ordem)")
      .eq("materia_id", materiaId)
      .order("ordem"),
    supabase.from("aula_topico").select("id, titulo, ordem, posicao").eq("materia_id", materiaId).order("posicao"),
    supabase.from("questionario").select("id, aula_id, titulo, posicao, encerra_materia").eq("materia_id", materiaId).order("posicao"),
  ]);
  const questoesFallback = questoesConsulta.error
    ? await supabase
        .from("questao")
        .select("id, enunciado, ordem, questionario_id, alternativas:alternativa(id, texto, correta, ordem)")
        .eq("materia_id", materiaId)
        .order("ordem")
    : null;
  const questoes = (questoesFallback?.data ?? questoesConsulta.data ?? []).map((questao) => ({
    ...questao,
    ativo: "ativo" in questao ? Boolean(questao.ativo) : true,
  }));
  const aulaIds = (aulas ?? []).map((aula) => aula.id);
  const { data: arquivos } = aulaIds.length
    ? await supabase.from("aula_arquivo").select("id, aula_id, topico_id, nome, visualizar, baixar").in("aula_id", aulaIds)
    : { data: [] as { id: string; aula_id: string; topico_id: string | null; nome: string; visualizar: boolean; baixar: boolean }[] };

  const listaQuestoes = (questoes ?? []) as {
    id: string;
    enunciado: string;
    ordem: number;
    ativo: boolean;
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
        ativo: questao.ativo,
        alternativas: (questao.alternativas ?? []).slice().sort((a, b) => a.ordem - b.ordem),
      }));
  }

  const raiz = [
    ...(secoes ?? []).map((secao) => ({ tipo: "secao" as const, posicao: Number(secao.posicao ?? secao.ordem), secao })),
    ...(aulas ?? []).map((aula) => ({ tipo: "aula" as const, posicao: Number(aula.posicao ?? aula.ordem), aula })),
    ...quizzes.filter((quiz) => !quiz.aula_id).map((quiz) => ({ tipo: "questionario" as const, posicao: Number(quiz.posicao), quiz })),
  ].sort((a, b) => a.posicao - b.posicao);

  return (
    <div className="flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Editar matéria</h1>
        <Link
          href="/secretaria/materias"
          className="inline-flex h-10 items-center justify-center rounded-md border bg-white px-4 text-sm font-medium hover:bg-secondary"
        >
          Voltar à lista
        </Link>
      </div>

      <Card>
        <ActionForm action={salvarMateria} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={materia.id} />
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="grid gap-1">
              <CardTitle>Informações da matéria</CardTitle>
              <CardDescription>Alterações são salvas ao clicar em Salvar.</CardDescription>
            </div>
            <InterruptorForm name="ativo" rotulo="Matéria ativa" defaultChecked={materia.ativo} />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Nome">
                <Input name="nome" defaultValue={materia.nome} required />
              </Field>
            </div>
            <Field label="Slug">
              <Input name="slug" defaultValue={materia.slug} required />
            </Field>
            <Field label="Carga horária">
              <Input name="carga_horaria" type="number" min={0} defaultValue={materia.carga_horaria} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Descrição">
                <Textarea name="descricao" defaultValue={materia.descricao} />
              </Field>
            </div>
            <div className="grid grid-cols-4 gap-3 sm:col-span-2">
              <Field label="Nota mínima da prova">
                <Input name="nota_minima" type="number" min={0} max={10} step="0.1" defaultValue={materia.nota_minima} />
              </Field>
              <Field label="Questões na prova">
                <Input name="prova_quantidade" type="number" min={1} max={100} step={1} placeholder="Todas" defaultValue={materia.prova_quantidade ?? ""} />
              </Field>
              <Field label="Tempo (minutos)">
                <Input name="prova_duracao_minutos" type="number" min={5} max={240} step={1} defaultValue={materia.prova_duracao_minutos ?? 60} required />
              </Field>
              <Field label="Validade (dias)">
                <Input name="validade_dias" type="number" min={1} step={1} placeholder="Ex.: 90" defaultValue={materia.validade_dias ?? ""} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <SubmitButton>Salvar matéria</SubmitButton>
            </div>
            </div>
          </CardContent>
        </ActionForm>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Conteúdo</CardTitle>
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
        </CardHeader>
        <CardContent>
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
            };
          })}
        />
        </CardContent>
      </Card>
    </div>
  );
}
