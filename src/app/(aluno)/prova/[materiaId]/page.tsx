import Link from "next/link";
import { notFound } from "next/navigation";
import { enviarProva } from "@/actions/estudo";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
type Questao = {
  id: string;
  enunciado: string;
  ordem: number;
  alternativas: { id: string; texto: string; ordem: number }[];
};

export default async function ProvaPage({ params }: { params: Promise<{ materiaId: string }> }) {
  const { materiaId } = await params;
  await requireAluno();
  const supabase = await createClient();
  const { data: materia } = await supabase
    .from("materia")
    .select("id, nome, nota_minima")
    .eq("id", materiaId)
    .maybeSingle();
  if (!materia) notFound();

  const { data: questoes, error } = await supabase.rpc("questoes_da_materia", {
    p_materia_id: materiaId,
  });
  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">{materia.nome}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Esta matéria não está liberada para a sua conta.</p>
        <Link href="/meus-cursos" className="mt-4 inline-block text-sm text-primary">
          Voltar
        </Link>
      </div>
    );
  }

  const lista = (questoes ?? []) as Questao[];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Prova — {materia.nome}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Nota mínima {String(materia.nota_minima)}.</p>
      {lista.length === 0 ? (
        <p className="mt-4 text-sm">A prova ainda não tem questões.</p>
      ) : (
        <ActionForm action={enviarProva} className="mt-6 space-y-6">
          <input type="hidden" name="materia_id" value={materiaId} />
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
          <SubmitButton pendingLabel="Enviando...">Enviar prova</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
