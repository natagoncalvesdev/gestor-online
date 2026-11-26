import Link from "next/link";
import { notFound } from "next/navigation";
import { gabaritoDaProva, respostasDaProva } from "@/actions/estudo";
import { BotaoBaixarProva } from "@/components/estudo/botao-baixar-prova";
import { ProvaVisualizacao, type QuestaoVisualizacao } from "@/components/estudo/prova-visualizacao";
import { PageTitle } from "@/components/page-title";
import { createClient } from "@/lib/supabase/server";
import { requireInterno } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import { um } from "@/lib/relacao";

export default async function ProvaAlunoSecretariaPage({
  params,
}: {
  params: Promise<{ alunoId: string; tentativaId: string }>;
}) {
  await requireInterno();
  const { alunoId, tentativaId } = await params;
  const supabase = await createClient();
  const { data: tentativa } = await supabase
    .from("tentativa_prova")
    .select(
      "id, aluno_id, materia_id, questionario_id, nota, aprovado, acertos, total, codigo, entregue_em, aluno:aluno_id(nome, numero_aluno), materia:materia_id(nome)",
    )
    .eq("id", tentativaId)
    .eq("aluno_id", alunoId)
    .maybeSingle();
  if (!tentativa) notFound();

  const aluno = um(tentativa.aluno as { nome: string; numero_aluno: string | null } | { nome: string; numero_aluno: string | null }[] | null);
  const materia = um(tentativa.materia as { nome: string } | { nome: string }[] | null);
  const { data: questoes } = await supabase.rpc("questoes_do_andamento", { p_andamento: tentativa.id });
  const respostas = await respostasDaProva(supabase, tentativa.id as string);
  const corretas = await gabaritoDaProva(tentativa.id as string);
  const escolhas = Object.fromEntries(respostas.map((item) => [item.questao_id, item.alternativa_id]));
  const listaQuestoes = (questoes ?? []) as QuestaoVisualizacao[];
  const gabarito = new Set(corretas);
  const nota = tentativa.nota == null ? "—" : Number(tentativa.nota).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle
          title={materia?.nome ? `Prova · ${materia.nome}` : "Prova"}
          description={`${aluno?.nome ?? "Aluno"}${tentativa.codigo ? ` · Código ${tentativa.codigo}` : ""}`}
        />
        <Link
          href={`/secretaria/alunos/${alunoId}`}
          className="inline-flex h-8 items-center rounded-md border bg-white px-3 text-xs font-medium hover:bg-secondary"
        >
          Voltar ao aluno
        </Link>
      </div>
      <section className="overflow-hidden rounded-xl border bg-card px-4 py-5">
        <p className="text-sm text-muted-foreground">Resultado</p>
        <p className="text-2xl font-semibold tabular-nums">Nota {nota}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {Number(tentativa.acertos ?? 0)} de {Number(tentativa.total ?? 0)} questões corretas
          {tentativa.aprovado == null ? "" : tentativa.aprovado ? " · Aprovado" : " · Reprovado"}
          {tentativa.entregue_em ? ` · ${formatDateTime(tentativa.entregue_em as string)}` : ""}
        </p>
        <div className="mt-4">
          <BotaoBaixarProva
            dados={{
              materiaNome: materia?.nome ?? "Matéria",
              alunoNome: aluno?.nome ?? "Aluno",
              numeroAluno: aluno?.numero_aluno ?? null,
              codigo: (tentativa.codigo as string | null) ?? null,
              nota: tentativa.nota == null ? null : Number(tentativa.nota),
              acertos: tentativa.acertos == null ? null : Number(tentativa.acertos),
              quantidade: Number(tentativa.total ?? listaQuestoes.length),
              questoes: listaQuestoes.map((questao, indice) => ({
                ordem: indice + 1,
                enunciado: questao.enunciado,
                alternativaEscolhidaId: escolhas[questao.id] ?? null,
                alternativas: [...questao.alternativas]
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((alternativa) => ({
                    id: alternativa.id,
                    texto: alternativa.texto,
                    correta: gabarito.has(alternativa.id),
                  })),
              })),
            }}
          />
        </div>
      </section>
      <ProvaVisualizacao
        questoes={listaQuestoes}
        escolhas={escolhas}
        corretas={corretas}
      />
    </div>
  );
}
