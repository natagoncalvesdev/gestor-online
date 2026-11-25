import { notFound } from "next/navigation";
import { CorpoPasso } from "@/components/estudo/corpo-passo";
import { NavegacaoPasso } from "@/components/estudo/navegacao-passo";
import { PlayerCurso } from "@/components/estudo/player-curso";
import { acessoMateria } from "@/lib/acesso-materia";
import { licaoLiberada, textoLiberacao } from "@/lib/ebd";
import { um } from "@/lib/relacao";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireAluno } from "@/lib/session";
import { carregarTrilha, vizinhos } from "@/lib/trilha";

export default async function TopicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ topicoId: string }>;
  searchParams: Promise<{ matricula?: string }>;
}) {
  const { topicoId } = await params;
  const { matricula: matriculaInformada } = await searchParams;
  await requireAluno();
  const supabase = await createClient();
  const { data: topico } = await supabase
    .from("topico")
    .select("id, titulo, conteudo, bunny_video_id, youtube_id, epub_path, libera_em, aula:aula_id(id, materia_id, libera_em, titulo)")
    .eq("id", topicoId)
    .maybeSingle();
  const aula = um(
    topico?.aula as
      | { id: string; materia_id: string; libera_em: string | null; titulo: string }
      | { id: string; materia_id: string; libera_em: string | null; titulo: string }[]
      | null
  );
  if (!topico || !aula) notFound();

  const acesso = await acessoMateria(aula.materia_id, matriculaInformada);
  if (!acesso) notFound();

  const admin = createServiceRoleClient();
  const { data: arquivos } = admin
    ? await admin.from("aula_arquivo").select("id, nome, mime, visualizar, baixar").eq("topico_id", topico.id).order("criado_em")
    : { data: [] };
  const { data: progresso } = await supabase
    .from("topico_progresso")
    .select("video_concluido, ebook_cfi")
    .eq("topico_id", topico.id)
    .eq("aluno_id", acesso.session.user.id)
    .maybeSingle();
  const passos = await carregarTrilha(supabase, aula.materia_id, acesso.session.user.id, acesso.consulta);
  const { anterior, seguinte } = vizinhos(passos, "topico", topico.id);
  const aulaFechada = Boolean(aula.libera_em && !licaoLiberada(aula.libera_em));
  const topicoFechado = Boolean(topico.libera_em && !licaoLiberada(topico.libera_em));
  const bloqueada = aulaFechada || topicoFechado;
  const quando = aulaFechada ? aula.libera_em : topico.libera_em;

  return (
    <PlayerCurso
      voltarRotulo={acesso.materiaNome}
      voltar={acesso.voltar}
      titulo={topico.titulo}
      rodape={
        <NavegacaoPasso
          voltar={acesso.voltar}
          anterior={anterior}
          seguinte={seguinte}
          concluir={
            bloqueada
              ? undefined
              : {
                  topicoId: topico.id,
                  matriculaId: acesso.matriculaId,
                  materiaId: aula.materia_id,
                  visto: Boolean(progresso?.video_concluido),
                }
          }
        />
      }
    >
      {bloqueada ? (
        <p className="text-sm text-muted-foreground">Este tópico abre em {textoLiberacao(quando)}.</p>
      ) : (
        <CorpoPasso
          titulo={topico.titulo}
          youtubeId={topico.youtube_id}
          bunnyId={topico.bunny_video_id}
          conteudo={topico.conteudo ?? ""}
          arquivos={arquivos ?? []}
          epub={
            topico.epub_path
              ? { url: `/api/ebook/topico/${topico.id}`, cfi: progresso?.ebook_cfi ?? null, campo: "topico_id", id: topico.id }
              : null
          }
        />
      )}
    </PlayerCurso>
  );
}
