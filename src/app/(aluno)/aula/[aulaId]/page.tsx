import Link from "next/link";
import { notFound } from "next/navigation";
import { marcarAulaVista } from "@/actions/estudo";
import { ActionForm } from "@/components/action-form";
import { EpubReader } from "@/components/estudo/epub-reader";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
import { bunnyEmbedUrl } from "@/lib/bunny";

export default async function AulaPage({ params }: { params: Promise<{ aulaId: string }> }) {
  const { aulaId } = await params;
  const session = await requireAluno();
  const supabase = await createClient();
  const { data: aula } = await supabase
    .from("aula")
    .select("id, titulo, bunny_video_id, epub_path, materia_id")
    .eq("id", aulaId)
    .maybeSingle();
  if (!aula) notFound();

  const { data: progresso } = await supabase
    .from("aula_progresso")
    .select("video_concluido, ebook_cfi")
    .eq("aula_id", aulaId)
    .eq("aluno_id", session.user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <p className="text-sm">
        <Link href="/meus-cursos">Voltar aos cursos</Link>
      </p>
      <h1 className="text-2xl font-semibold">{aula.titulo}</h1>
      {aula.bunny_video_id ? (
        <iframe
          title={aula.titulo}
          src={bunnyEmbedUrl(aula.bunny_video_id)}
          className="aspect-video w-full rounded-xl border"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <p className="text-sm text-muted-foreground">Esta aula não tem vídeo.</p>
      )}
      <ActionForm action={marcarAulaVista}>
        <input type="hidden" name="aula_id" value={aula.id} />
        <SubmitButton variant="outline" pendingLabel="Salvando...">
          {progresso?.video_concluido ? "Aula já marcada como assistida" : "Marcar aula como assistida"}
        </SubmitButton>
      </ActionForm>
      {aula.epub_path ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Livro digital</h2>
          <EpubReader aulaId={aula.id} cfiInicial={progresso?.ebook_cfi ?? null} />
        </section>
      ) : null}
    </div>
  );
}
