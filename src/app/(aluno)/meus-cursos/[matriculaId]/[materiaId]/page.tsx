import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
import { um } from "@/lib/relacao";

export default async function MateriaAlunoPage({
  params,
}: {
  params: Promise<{ matriculaId: string; materiaId: string }>;
}) {
  const { matriculaId, materiaId } = await params;
  const session = await requireAluno();
  const supabase = await createClient();
  const { data: matricula } = await supabase
    .from("matricula")
    .select("id")
    .eq("id", matriculaId)
    .eq("aluno_id", session.user.id)
    .maybeSingle();
  if (!matricula) notFound();

  const { data: acesso } = await supabase
    .from("matricula_materia")
    .select("status, materia:materia_id(nome)")
    .eq("matricula_id", matriculaId)
    .eq("materia_id", materiaId)
    .maybeSingle();
  if (!acesso) notFound();

  const materia = um(acesso.materia as { nome: string } | { nome: string }[] | null);
  if (acesso.status === "bloqueada") {
    return (
      <div>
        <h1 className="text-2xl font-semibold">{materia?.nome}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Esta matéria ainda não foi liberada.</p>
      </div>
    );
  }

  const { data: aulas } = await supabase
    .from("aula")
    .select("id, titulo, ordem, bunny_video_id, epub_nome")
    .eq("materia_id", materiaId)
    .order("ordem");

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        <Link href="/meus-cursos">Meus cursos</Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{materia?.nome}</h1>
      <ul className="mt-6 divide-y rounded-xl border bg-card">
        {(aulas ?? []).map((aula) => (
          <li key={aula.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{aula.titulo}</p>
              <p className="text-xs text-muted-foreground">
                {[aula.bunny_video_id ? "Vídeo" : null, aula.epub_nome ? "Livro digital" : null]
                  .filter(Boolean)
                  .join(" · ") || "Sem material"}
              </p>
            </div>
            <Link href={`/aula/${aula.id}`} className="text-sm text-primary">
              Assistir
            </Link>
          </li>
        ))}
      </ul>
      {acesso.status === "liberada" ? (
        <Link href={`/prova/${materiaId}`} className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          Fazer a prova
        </Link>
      ) : (
        <p className="mt-4 text-sm text-emerald-800">Matéria concluída.</p>
      )}
    </div>
  );
}
