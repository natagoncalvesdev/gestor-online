import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { marcarAulaVista } from "@/actions/estudo";
import { ActionForm } from "@/components/action-form";
import { EpubReader } from "@/components/estudo/epub-reader";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
import { bunnyEmbedUrl } from "@/lib/bunny";
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
    .select("id, titulo, ordem, bunny_video_id, epub_path, materia_id")
    .eq("id", aulaId)
    .maybeSingle();
  if (!aula) notFound();

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
  if (!acesso) notFound();

  const produto = um(
    um(acesso.matricula as { produto: { nome: string } | { nome: string }[] | null } | { produto: { nome: string } | { nome: string }[] | null }[] | null)?.produto ?? null
  );
  const materia = um(acesso.materia as { nome: string } | { nome: string }[] | null);
  const matriculaId = acesso.matricula_id as string;
  const voltar = `/meus-cursos/${matriculaId}/${aula.materia_id}`;

  const { data: aulas } = await supabase.from("aula").select("id, titulo, ordem").eq("materia_id", aula.materia_id).order("ordem");
  const lista = aulas ?? [];
  const indice = lista.findIndex((item) => item.id === aula.id);
  const anterior = indice > 0 ? lista[indice - 1] : null;
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

      {aula.bunny_video_id ? (
        <iframe
          title={aula.titulo}
          src={bunnyEmbedUrl(aula.bunny_video_id)}
          className="aspect-video w-full rounded-md border bg-black"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <p className="rounded-md border bg-card p-4 text-sm text-muted-foreground">Esta aula não tem vídeo.</p>
      )}

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
        {anterior ? (
          <Link href={`/aula/${anterior.id}?matricula=${matriculaId}`} className="inline-flex h-11 items-center justify-center gap-1 rounded-md bg-secondary px-3 text-sm font-semibold text-muted-foreground">
            <ChevronLeft className="size-4" /> Anterior
          </Link>
        ) : (
          <span className="inline-flex h-11 items-center justify-center gap-1 rounded-md bg-secondary px-3 text-sm font-semibold text-muted-foreground/60">
            <ChevronLeft className="size-4" /> Anterior
          </span>
        )}
        <ActionForm action={marcarAulaVista}>
          <input type="hidden" name="aula_id" value={aula.id} />
          <input type="hidden" name="matricula_id" value={matriculaId} />
          <input type="hidden" name="materia_id" value={aula.materia_id} />
          <SubmitButton variant="accent" pendingLabel="Salvando..." className="h-11 uppercase tracking-wide">
            {vista ? "Concluído" : "Marcar concluído"}
          </SubmitButton>
        </ActionForm>
        {seguinte ? (
          <Link href={`/aula/${seguinte.id}?matricula=${matriculaId}`} className="inline-flex h-11 items-center justify-center gap-1 rounded-md bg-primary px-3 text-sm font-semibold uppercase tracking-wide text-primary-foreground">
            Próximo <ChevronRight className="size-4" />
          </Link>
        ) : (
          <Link href={`/prova/${aula.materia_id}`} className="inline-flex h-11 items-center justify-center gap-1 rounded-md bg-primary px-3 text-sm font-semibold uppercase tracking-wide text-primary-foreground">
            Prova <ChevronRight className="size-4" />
          </Link>
        )}
      </div>

      <section className="rounded-xl border bg-card">
        <h2 className="px-4 pt-4 font-medium">Conteúdo</h2>
        <ul>
          {lista.map((item) => (
            <li key={item.id} className="border-t">
              <Link href={`/aula/${item.id}?matricula=${matriculaId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                <span className={vistas.has(item.id) ? "size-5 shrink-0 rounded-full border-2 border-primary bg-primary" : "size-5 shrink-0 rounded-full border-2 border-muted-foreground/40"} />
                <span className={item.id === aula.id ? "font-medium" : "text-foreground"}>
                  {item.ordem} – {item.titulo}
                </span>
              </Link>
            </li>
          ))}
          <li className="border-t">
            <Link href={`/prova/${aula.materia_id}`} className="flex items-center gap-3 px-4 py-3 text-primary hover:bg-secondary/60">
              <Lock className="size-4" />
              Prova – {materia?.nome}
            </Link>
          </li>
        </ul>
      </section>

      <div className="grid gap-2 sm:grid-cols-3">
        <Link href={voltar} className="inline-flex h-11 items-center justify-center gap-1 rounded-md border bg-white px-3 text-sm font-medium">
          <ChevronLeft className="size-4" /> Voltar para o curso
        </Link>
        <ActionForm action={marcarAulaVista} className="sm:justify-self-center">
          <input type="hidden" name="aula_id" value={aula.id} />
          <input type="hidden" name="matricula_id" value={matriculaId} />
          <input type="hidden" name="materia_id" value={aula.materia_id} />
          <SubmitButton pendingLabel="Salvando..." className="h-11 w-full">
            <Check className="size-4" /> {vista ? "Concluído" : "Marcar concluído"}
          </SubmitButton>
        </ActionForm>
        {seguinte ? (
          <Link href={`/aula/${seguinte.id}?matricula=${matriculaId}`} className="inline-flex h-11 items-center justify-center rounded-md border bg-white px-3 text-sm text-muted-foreground">
            Próxima lição
          </Link>
        ) : (
          <span />
        )}
      </div>

      {aula.epub_path ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Livro digital</h2>
          <EpubReader aulaId={aula.id} cfiInicial={progresso?.ebook_cfi ?? null} />
        </section>
      ) : null}
    </div>
  );
}
