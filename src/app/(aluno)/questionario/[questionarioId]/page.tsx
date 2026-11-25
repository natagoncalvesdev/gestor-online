import Link from "next/link";
import { notFound } from "next/navigation";
import { enviarProva } from "@/actions/estudo";
import { ActionForm } from "@/components/action-form";
import { NavegacaoPasso } from "@/components/estudo/navegacao-passo";
import { PlayerCurso } from "@/components/estudo/player-curso";
import { SubmitButton } from "@/components/submit-button";
import { acessoMateria } from "@/lib/acesso-materia";
import { um } from "@/lib/relacao";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
import { carregarTrilha, vizinhos } from "@/lib/trilha";

type Questao = {
  id: string;
  enunciado: string;
  ordem: number;
  alternativas: { id: string; texto: string; ordem: number }[];
};

export default async function QuestionarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ questionarioId: string }>;
  searchParams: Promise<{ matricula?: string }>;
}) {
  const { questionarioId } = await params;
  const { matricula: matriculaInformada } = await searchParams;
  await requireAluno();
  const supabase = await createClient();
  const { data: questionario } = await supabase
    .from("questionario")
    .select("id, titulo, materia_id, nota_minima, encerra_materia, materia:materia_id(nota_minima)")
    .eq("id", questionarioId)
    .maybeSingle();
  if (!questionario) notFound();

  const acesso = await acessoMateria(questionario.materia_id, matriculaInformada);
  if (!acesso) notFound();

  const materia = um(questionario.materia as { nota_minima: number } | { nota_minima: number }[] | null);
  const notaMinima = questionario.nota_minima ?? materia?.nota_minima;
  const { data: questoes, error } = await supabase.rpc("questoes_do_questionario", {
    p_questionario_id: questionarioId,
  });
  const passos = await carregarTrilha(supabase, questionario.materia_id, acesso.session.user.id, acesso.consulta);
  const { anterior, seguinte } = vizinhos(passos, "questionario", questionario.id);
  const lista = (questoes ?? []) as Questao[];

  return (
    <PlayerCurso
      voltarRotulo={acesso.materiaNome}
      voltar={acesso.voltar}
      titulo={questionario.titulo}
      rodape={<NavegacaoPasso voltar={acesso.voltar} anterior={anterior} seguinte={seguinte} />}
    >
      <p className="text-sm text-muted-foreground">
        Nota mínima {String(notaMinima)}.
        {questionario.encerra_materia ? " A aprovação conclui a matéria." : ""}
      </p>
      {error ? (
        <p className="text-sm text-muted-foreground">Este questionário não está liberado para a sua conta.</p>
      ) : lista.length === 0 ? (
        <p className="text-sm">O questionário ainda não tem questões.</p>
      ) : (
        <ActionForm action={enviarProva} className="space-y-6">
          <input type="hidden" name="materia_id" value={questionario.materia_id} />
          <input type="hidden" name="questionario_id" value={questionario.id} />
          {lista.map((questao, indice) => (
            <fieldset key={questao.id} className="rounded-xl border bg-card p-4">
              <legend className="px-1 text-sm font-medium">
                {indice + 1}. {questao.enunciado}
              </legend>
              <div className="mt-3 space-y-2">
                {questao.alternativas
                  .slice()
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((alternativa) => (
                    <label key={alternativa.id} className="flex items-start gap-2 text-sm">
                      <input type="radio" name={`questao_${questao.id}`} value={alternativa.id} required />
                      <span>{alternativa.texto}</span>
                    </label>
                  ))}
              </div>
            </fieldset>
          ))}
          <SubmitButton pendingLabel="Enviando...">Enviar</SubmitButton>
        </ActionForm>
      )}
      <Link href={acesso.voltar} className="text-sm text-primary">
        Voltar ao curso
      </Link>
    </PlayerCurso>
  );
}
