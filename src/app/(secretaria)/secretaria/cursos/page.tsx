import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";
import { PageTitle } from "@/components/page-title";

const LIMITE = {
  1: "1 matéria por vez",
  2: "2 matérias por vez",
  3: "3 matérias por vez",
} as const;

export default async function CursosPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("curso")
    .select("id, nome, materias_simultaneas, ativo")
    .order("nome");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <PageTitle title="Cursos" description="O curso define quantas matérias ficam abertas ao mesmo tempo." />
        <Link href="/secretaria/cursos/novo" className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
          Novo curso
        </Link>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {(data ?? []).map((curso) => (
          <li key={curso.id}>
            <Link href={`/secretaria/cursos/${curso.id}`} className="block p-4 hover:bg-secondary">
              <p className="font-medium">{curso.nome}</p>
              <p className="text-sm text-muted-foreground">
                {LIMITE[curso.materias_simultaneas as 1 | 2 | 3]}
                {curso.ativo ? "" : " · inativo"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
