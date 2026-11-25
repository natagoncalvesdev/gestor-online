import { notFound } from "next/navigation";
import { CarrosselBanners } from "@/components/inicio/carrossel-banners";
import { CorpoPasso } from "@/components/estudo/corpo-passo";
import { NavegacaoPasso } from "@/components/estudo/navegacao-passo";
import { PlayerCurso } from "@/components/estudo/player-curso";
import { acessoMateria } from "@/lib/acesso-materia";
import { licaoLiberada, textoLiberacao } from "@/lib/ebd";
import { urlImagemSite } from "@/lib/site-imagem";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { carregarTrilha, vizinhos } from "@/lib/trilha";

export default async function AulaPage({
  params,
  searchParams,
}: {
  params: Promise<{ aulaId: string }>;
  searchParams: Promise<{ matricula?: string }>;
}) {
  const { aulaId } = await params;
  const { matricula: matriculaInformada } = await searchParams;
  const supabase = await createClient();
  const { data: aula } = await supabase
    .from("aula")
    .select("id, titulo, conteudo, bunny_video_id, youtube_id, epub_path, materia_id, libera_em")
    .eq("id", aulaId)
    .maybeSingle();
  if (!aula) notFound();

  const acesso = await acessoMateria(aula.materia_id, matriculaInformada);
  if (!acesso) notFound();

  const admin = createServiceRoleClient();
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

  const { data: arquivos } = admin
    ? await admin.from("aula_arquivo").select("id, nome, mime, visualizar, baixar").eq("aula_id", aula.id).is("topico_id", null).order("criado_em")
    : { data: [] };
  const { data: progresso } = await acesso.supabase
    .from("aula_progresso")
    .select("video_concluido, ebook_cfi")
    .eq("aula_id", aulaId)
    .eq("aluno_id", acesso.session.user.id)
    .maybeSingle();
  const passos = await carregarTrilha(acesso.supabase, aula.materia_id, acesso.session.user.id, acesso.consulta);
  const { anterior, seguinte } = vizinhos(passos, "aula", aula.id);
  const bloqueada = Boolean(aula.libera_em && !licaoLiberada(aula.libera_em));

  return (
    <>
      {faixa.length > 0 ? (
        <div className="-mx-4 -mt-8 mb-5">
          <CarrosselBanners banners={faixa} compacto />
        </div>
      ) : null}
      <PlayerCurso
        produtoNome={acesso.produtoNome}
        voltar={acesso.voltar}
        titulo={aula.titulo}
        rodape={
          <NavegacaoPasso
            voltar={acesso.voltar}
            anterior={anterior}
            seguinte={seguinte}
            concluir={
              bloqueada
                ? undefined
                : {
                    aulaId: aula.id,
                    matriculaId: acesso.matriculaId,
                    materiaId: aula.materia_id,
                    visto: Boolean(progresso?.video_concluido),
                  }
            }
          />
        }
      >
        {bloqueada ? (
          <p className="text-sm text-muted-foreground">Esta aula abre em {textoLiberacao(aula.libera_em)}.</p>
        ) : (
          <CorpoPasso
            titulo={aula.titulo}
            youtubeId={aula.youtube_id}
            bunnyId={aula.bunny_video_id}
            conteudo={aula.conteudo ?? ""}
            arquivos={arquivos ?? []}
            epub={
              aula.epub_path
                ? { url: `/api/ebook/${aula.id}`, cfi: progresso?.ebook_cfi ?? null, campo: "aula_id", id: aula.id }
                : null
            }
          />
        )}
      </PlayerCurso>
    </>
  );
}
