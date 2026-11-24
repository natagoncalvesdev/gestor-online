import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";
import { PageTitle } from "@/components/page-title";

export default async function MateriasPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("materia").select("id, nome, codigo, ativo").order("nome");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <PageTitle title="Matérias" description="Cada matéria reúne aulas, livro digital e prova." />
        <Link href="/secretaria/materias/nova" className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">
          Nova matéria
        </Link>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {(data ?? []).map((materia) => (
          <li key={materia.id}>
            <Link href={`/secretaria/materias/${materia.id}`} className="block p-4 hover:bg-secondary">
              <p className="font-medium">{materia.nome}</p>
              <p className="text-sm text-muted-foreground">
                {materia.codigo}
                {materia.ativo ? "" : " · inativa"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
