import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { marcarAulaVista } from "@/actions/estudo";
import { ActionForm } from "@/components/action-form";
import { EpubReader } from "@/components/estudo/epub-reader";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireAluno } from "@/lib/session";
import { licaoLiberada, textoLiberacao } from "@/lib/ebd";
import { bunnyEmbedUrl } from "@/lib/bunny";
import { urlImagemSite } from "@/lib/site-imagem";
import { CarrosselBanners } from "@/components/inicio/carrossel-banners";
import { um } from "@/lib/relacao";

export default async function AulaPage({
  params,
  searchParams,
}: {
  params: Promise<{ aulaId: string }>;
  searchParams: Promise<{ matricula?: string }>;
}) {
  const { aulaId } = await params;
  const { matricula: matriculaInformada } = await searchParams;
  const session = await requireAluno();
  const supabase = await createClient();
  const { data: aula } = await supabase
    .from("aula")
    .select("id, titulo, ordem, bunny_video_id, youtube_id, epub_path, materia_id, libera_em")
    .eq("id", aulaId)
    .maybeSingle();
  if (!aula) notFound();
  if (aula.libera_em && !licaoLiberada(aula.libera_em)) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold">{aula.titulo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Esta aula abre em {textoLiberacao(aula.libera_em)}.</p>
      </div>
    );
  }

  const { data: acessos } = await supabase
    .from("matricula_materia")
    .select("status, matricula_id, materia:materia_id(nome), matricula:matricula_id(aluno_id, produto:produto_id(nome))")
    .eq("materia_id", aula.materia_id)
    .neq("status", "bloqueada");
  const abertos = (acessos ?? []).filter((item) => {
    const matricula = um(item.matricula as { aluno_id: string; produto: { nome: string } | { nome: string }[] | null } | { aluno_id: string; produto: { nome: string } | { nome: string }[] | null }[] | null);
    return matricula?.aluno_id === session.user.id;
  });
  const acesso = abertos.find((item) => item.matricula_id === matriculaInformada) ?? abertos[0];
  const { data: materiaAberta } = acesso
    ? { data: null }
    : await supabase.from("materia").select("nome").eq("id", aula.materia_id).eq("para_todos", true).eq("ativo", true).maybeSingle();
  if (!acesso && !materiaAberta) notFound();

  const produto = acesso
    ? um(
        um(acesso.matricula as { produto: { nome: string } | { nome: string }[] | null } | { produto: { nome: string } | { nome: string }[] | null }[] | null)?.produto ?? null
      )
    : null;
  const materia = acesso ? um(acesso.materia as { nome: string } | { nome: string }[] | null) : materiaAberta;
  const matriculaId = acesso ? (acesso.matricula_id as string) : null;
  const voltar = matriculaId ? `/meus-cursos/${matriculaId}/${aula.materia_id}` : `/meus-cursos/aberto/${aula.materia_id}`;
  const consulta = matriculaId ? `?matricula=${matriculaId}` : "";

  const admin = createServiceRoleClient();
  const { data: banners } = await supabase
    .from("home_banner")
    .select("id, imagem_path, imagem_zoom, imagem_x, imagem_y, link")
    .eq("ativo", true)
    .order("ordem");
  const faixa = (banners ?? [])
    .map((item) => {
      const src = urlImagemSite(item.imagem_path);
      if (!src) return null;
      return {
        id: item.id,
        src,
        zoom: Number(item.imagem_zoom),
        x: Number(item.imagem_x),
        y: Number(item.imagem_y),
        link: item.link,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const { data: arquivos } = admin
    ? await admin.from("aula_arquivo").select("id, nome, mime, visualizar, baixar").eq("aula_id", aula.id).order("criado_em")
    : { data: [] };
  const paraVer = (arquivos ?? []).filter((arquivo) => arquivo.visualizar);
  const paraBaixar = (arquivos ?? []).filter((arquivo) => arquivo.baixar);
  const { count: questoes } = admin
    ? await admin.from("questao").select("id", { count: "exact", head: true }).eq("materia_id", aula.materia_id)
    : { count: 0 };
  const temProva = (questoes ?? 0) > 0;

  const { data: aulas } = await supabase.from("aula").select("id, titulo, ordem").eq("materia_id", aula.materia_id).order("ordem");
  const lista = aulas ?? [];
  const indice = lista.findIndex((item) => item.id === aula.id);
  const seguinte = indice >= 0 && indice < lista.length - 1 ? lista[indice + 1] : null;

  const ids = lista.map((item) => item.id);
  const [{ data: progresso }, { data: todos }] = await Promise.all([
    supabase.from("aula_progresso").select("video_concluido, ebook_cfi").eq("aula_id", aulaId).eq("aluno_id", session.user.id).maybeSingle(),
    ids.length
      ? supabase.from("aula_progresso").select("aula_id, video_concluido").eq("aluno_id", session.user.id).in("aula_id", ids)
      : Promise.resolve({ data: [] }),
  ]);
  const vistas = new Set((todos ?? []).filter((item) => item.video_concluido).map((item) => item.aula_id));
  const vista = Boolean(progresso?.video_concluido);

  return (
    <>
      {faixa.length > 0 ? (
        <div className="-mx-4 -mt-8 mb-5">
          <CarrosselBanners banners={faixa} compacto />
        </div>
      ) : null}
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {aula.ordem} – {aula.titulo}
        </h1>
        <p className="mt-2 text-sm text-primary">
          <Link href={voltar} className="hover:underline">
            {produto?.nome ?? "Curso"}
          </Link>
          <span className="text-muted-foreground"> / </span>
          <span className="text-muted-foreground">{aula.titulo}</span>
        </p>
      </div>

      {aula.youtube_id ? (
        <iframe
          title={aula.titulo}
          src={`https://www.youtube-nocookie.com/embed/${aula.youtube_id}`}
          className="relative left-1/2 aspect-video w-[min(56rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border bg-black"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : aula.bunny_video_id ? (
        <iframe
          title={aula.titulo}
          src={bunnyEmbedUrl(aula.bunny_video_id)}
          className="relative left-1/2 aspect-video w-[min(56rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border bg-black"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : null}

      {paraBaixar.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {paraBaixar.map((arquivo) => (
            <a
              key={arquivo.id}
              href={`/api/aula/arquivo/${arquivo.id}?download=1`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border bg-white px-4 text-sm font-medium hover:bg-secondary"
            >
              {arquivo.nome}
            </a>
          ))}
        </div>
      ) : null}

      {paraVer.map((arquivo) =>
        arquivo.mime.startsWith("image/") ? (
          <img key={arquivo.id} src={`/api/aula/arquivo/${arquivo.id}`} alt={arquivo.nome} className="mx-auto aspect-[210/297] w-full max-w-[210mm] rounded-xl border bg-white object-contain" />
        ) : (
          <iframe key={arquivo.id} title={arquivo.nome} src={`/api/aula/arquivo/${arquivo.id}`} className="mx-auto aspect-[210/297] w-full max-w-[210mm] rounded-xl border bg-white" />
        )
      )}

      {aula.epub_path ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Livro digital</h2>
          <EpubReader aulaId={aula.id} cfiInicial={progresso?.ebook_cfi ?? null} />
        </section>
      ) : null}

      <section className="rounded-xl border bg-card">
        <h2 className="px-4 pt-4 font-medium">Conteúdo</h2>
        <ul>
          {lista.map((item) => (
            <li key={item.id} className="border-t">
              <Link href={`/aula/${item.id}${consulta}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                <span className={vistas.has(item.id) ? "size-5 shrink-0 rounded-full border-2 border-primary bg-primary" : "size-5 shrink-0 rounded-full border-2 border-muted-foreground/40"} />
                <span className={item.id === aula.id ? "font-medium" : "text-foreground"}>
                  {item.ordem} – {item.titulo}
                </span>
              </Link>
            </li>
          ))}
          {temProva ? (
            <li className="border-t">
              <Link href={`/prova/${aula.materia_id}`} className="flex items-center gap-3 px-4 py-3 text-primary hover:bg-secondary/60">
                <Lock className="size-4" />
                Prova – {materia?.nome}
              </Link>
            </li>
          ) : null}
        </ul>
      </section>

      <div className="grid gap-2 sm:grid-cols-3">
        <Link href={voltar} className="inline-flex h-11 items-center justify-center gap-1 rounded-md border bg-white px-3 text-sm font-medium">
          <ChevronLeft className="size-4" /> Voltar para o curso
        </Link>
        <ActionForm action={marcarAulaVista} className="sm:justify-self-center">
          <input type="hidden" name="aula_id" value={aula.id} />
          <input type="hidden" name="matricula_id" value={matriculaId ?? ""} />
          <input type="hidden" name="materia_id" value={aula.materia_id} />
          <SubmitButton pendingLabel="Salvando..." className="h-11 w-full">
            <Check className="size-4" /> {vista ? "Concluído" : "Marcar concluído"}
          </SubmitButton>
        </ActionForm>
        {seguinte ? (
          <Link href={`/aula/${seguinte.id}${consulta}`} className="inline-flex h-11 items-center justify-center gap-1 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground">
            Próximo <ChevronRight className="size-4" />
          </Link>
        ) : temProva ? (
          <Link href={`/prova/${aula.materia_id}`} className="inline-flex h-11 items-center justify-center gap-1 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground">
            Prova <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span />
        )}
      </div>
      </div>
    </>
  );
}
