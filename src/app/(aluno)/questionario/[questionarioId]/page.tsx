import { notFound } from "next/navigation";
import { CarrosselBanners } from "@/components/inicio/carrossel-banners";
import { NavegacaoPasso } from "@/components/estudo/navegacao-passo";
import { PlayerCurso } from "@/components/estudo/player-curso";
import { ProvaAluno, type QuestaoProva } from "@/components/estudo/prova-aluno";
import { gabaritoDaProva, respostasDaProva, tentativaProvaPendente } from "@/actions/estudo";
import { mensagemResultado } from "@/lib/prova-mensagem";
import { acessoMateria } from "@/lib/acesso-materia";
import { um } from "@/lib/relacao";
import { urlImagemSite } from "@/lib/site-imagem";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
import { carregarTrilha, vizinhos } from "@/lib/trilha";

export default async function QuestionarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ questionarioId: string }>;
  searchParams: Promise<{ matricula?: string; tentativa?: string }>;
}) {
  const { questionarioId } = await params;
  const { matricula: matriculaInformada, tentativa: tentativaInformada } = await searchParams;
  const session = await requireAluno();
  const supabase = await createClient();
  const { data: questionario } = await supabase
    .from("questionario")
    .select("id, titulo, materia_id, encerra_materia, materia:materia_id(nome, nota_minima, prova_duracao_minutos)")
    .eq("id", questionarioId)
    .maybeSingle();
  if (!questionario) notFound();

  const acesso = await acessoMateria(questionario.materia_id, matriculaInformada);
  if (!acesso) notFound();

  const materia = um(
    questionario.materia as
      | { nome: string; nota_minima: number; prova_duracao_minutos: number }
      | { nome: string; nota_minima: number; prova_duracao_minutos: number }[]
      | null
  );
  const comTempo = Boolean(questionario.encerra_materia);
  const { data: aberta } = comTempo
    ? await supabase
        .from("tentativa_prova")
        .select("id, expira_em, entregue_em, nota, acertos, total, aprovado, codigo")
        .eq("aluno_id", session.user.id)
        .eq("questionario_id", questionarioId)
        .is("entregue_em", null)
        .not("iniciada_em", "is", null)
        .maybeSingle()
    : { data: null };
  const { data: tentativasEntregues } = comTempo
    ? await supabase
        .from("tentativa_prova")
        .select("id, expira_em, entregue_em, nota, acertos, total, aprovado, codigo")
        .eq("aluno_id", session.user.id)
        .eq("questionario_id", questionarioId)
        .not("entregue_em", "is", null)
        .order("entregue_em", { ascending: false })
    : { data: [] as { id: string; expira_em: string; entregue_em: string | null; nota: number | null; acertos: number | null; total: number | null; aprovado: boolean | null; codigo: string | null }[] };
  const novaTentativa = acesso.provaNovaTentativa || (await tentativaProvaPendente(session.user.id, questionario.materia_id));
  const tentativaEscolhida = tentativaInformada
    ? (tentativasEntregues ?? []).find((item) => item.id === tentativaInformada) ?? null
    : null;
  const concluida = tentativaEscolhida ?? (novaTentativa ? null : ((tentativasEntregues ?? [])[0] ?? null));
  const andamento = tentativaEscolhida ?? aberta ?? concluida;
  const provaConcluida = Boolean(andamento?.entregue_em);
  const sessao = andamento
    ? {
        expiraEm: andamento.expira_em as string,
        servidorAgora: new Date().toISOString(),
        respostas: await respostasDaProva(supabase, andamento.id as string),
      }
    : null;
  const resultadoInicial =
    provaConcluida && andamento
      ? {
          nota: Number(andamento.nota ?? 0),
          aprovado: Boolean(andamento.aprovado),
          acertos: Number(andamento.acertos ?? 0),
          total: Number(andamento.total ?? 0),
          mensagem: mensagemResultado(
            Number(andamento.nota ?? 0),
            Number(andamento.acertos ?? 0),
            Number(andamento.total ?? 0),
            Boolean(andamento.aprovado),
            true
          ),
          corretas: await gabaritoDaProva(andamento.id as string),
        }
      : null;
  const { data: questoes, error } =
    !comTempo || sessao
      ? await supabase.rpc("questoes_do_questionario", { p_questionario_id: questionarioId })
      : { data: [], error: null };
  const { data: banners } = await acesso.supabase
    .from("home_banner")
    .select("id, imagem_path, imagem_zoom, imagem_x, imagem_y, link")
    .eq("ativo", true)
    .order("ordem");
  const faixa = (banners ?? [])
    .map((item) => {
      const src = urlImagemSite(item.imagem_path);
      if (!src) return null;
      return { id: item.id, src, zoom: Number(item.imagem_zoom), x: Number(item.imagem_x), y: Number(item.imagem_y), link: item.link };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const passos = await carregarTrilha(supabase, questionario.materia_id, acesso.session.user.id, acesso.consulta);
  const { anterior, seguinte } = vizinhos(passos, "questionario", questionario.id);
  const lista = (questoes ?? []) as QuestaoProva[];

  return (
    <>
      {faixa.length > 0 ? (
        <div className="-mx-4 -mt-8 mb-5">
          <CarrosselBanners banners={faixa} compacto />
        </div>
      ) : null}
      <PlayerCurso
        voltarRotulo={acesso.materiaNome}
        voltar={acesso.voltar}
        titulo={questionario.titulo}
        rodape={<NavegacaoPasso voltar={acesso.voltar} anterior={anterior} seguinte={seguinte} />}
      >
        {error ? (
          <p className="text-sm text-muted-foreground">Este questionário não está liberado para a sua conta.</p>
        ) : (
          <ProvaAluno
            materiaId={questionario.materia_id}
            materiaNome={materia?.nome || acesso.materiaNome}
            questionarioId={questionario.id}
            alunoNome={session.user.nome}
            numeroAluno={session.user.numero_aluno || null}
            notaMinima={materia?.nota_minima ?? null}
            comTempo={comTempo}
            duracaoMinutos={Number(materia?.prova_duracao_minutos ?? 60)}
            codigo={(andamento as { codigo?: string | null } | null)?.codigo ?? null}
            sessaoInicial={sessao}
            resultadoInicial={resultadoInicial}
            tentativasIniciais={(tentativasEntregues ?? []).map((item) => ({
              codigo: (item.codigo as string | null) ?? null,
              nota: Number(item.nota ?? 0),
              acertos: Number(item.acertos ?? 0),
              total: Number(item.total ?? 0),
              aprovado: Boolean(item.aprovado),
              entregueEm: (item.entregue_em as string | null) ?? null,
            }))}
            questoes={lista}
          />
        )}
      </PlayerCurso>
    </>
  );
}
