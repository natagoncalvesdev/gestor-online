import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";
import { MateriasOrdem } from "@/components/secretaria/materias-ordem";

function quantidade(valor: { count: number }[] | { id: string }[] | null) {
  const primeiro = valor?.[0] as { count?: number; id?: string } | undefined;
  if (primeiro && typeof primeiro.count === "number") return primeiro.count;
  return valor?.length ?? 0;
}

export default async function MateriasPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("materia")
    .select("id, nome, slug, carga_horaria, ativo, aulas:aula(count), questoes:questao(count)")
    .order("ordem");
  const materias = data ?? [];

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Matérias</h1>
        <Link
          href="/secretaria/materias/nova"
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto"
        >
          Nova matéria
        </Link>
      </div>

      {materias.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Nenhuma matéria cadastrada.
        </p>
      ) : (
        <MateriasOrdem
          itens={materias.map((materia) => ({
            id: materia.id,
            nome: materia.nome,
            slug: materia.slug,
            carga: `${materia.carga_horaria}h`,
            aulas: quantidade(materia.aulas as { count: number }[]),
            questoes: quantidade(materia.questoes as { count: number }[]),
            ativo: materia.ativo,
          }))}
        />
      )}
    </div>
  );
}
