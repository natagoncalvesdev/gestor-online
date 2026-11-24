import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
import { PageTitle } from "@/components/page-title";
import { lista, um } from "@/lib/relacao";

const ROTULO = {
  bloqueada: "Bloqueada",
  liberada: "Liberada",
  concluida: "Concluída",
} as const;

export default async function MeusCursosPage() {
  const session = await requireAluno();
  const supabase = await createClient();
  const { data } = await supabase
    .from("matricula")
    .select("id, status, produto:produto_id(nome, materias_simultaneas), materias:matricula_materia(ordem, status, materia:materia_id(id, nome))")
    .eq("aluno_id", session.user.id)
    .order("data_criacao", { ascending: false });

  const matriculas = data ?? [];

  return (
    <div>
      <PageTitle
        title="Meus cursos"
        description="Você estuda as matérias liberadas. A prova aprovada abre a próxima, dentro do limite do produto."
      />
      {matriculas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum estudo liberado ainda. <Link href="/loja">Ver a loja</Link>.
        </p>
      ) : (
        <div className="space-y-6">
          {matriculas.map((matricula) => {
            const produto = um(matricula.produto as { nome: string; materias_simultaneas: number } | { nome: string; materias_simultaneas: number }[] | null);
            const materias = lista(matricula.materias as {
              ordem: number;
              status: keyof typeof ROTULO;
              materia: { id: string; nome: string } | { id: string; nome: string }[] | null;
            }[]).sort((a, b) => a.ordem - b.ordem);
            return (
              <section key={matricula.id} className="rounded-xl border bg-card p-5">
                <h2 className="text-lg font-semibold">{produto?.nome ?? "Produto"}</h2>
                <p className="text-sm text-muted-foreground">
                  Até {produto?.materias_simultaneas ?? 1} {(produto?.materias_simultaneas ?? 1) === 1 ? "matéria aberta" : "matérias abertas"} ao mesmo tempo.
                </p>
                <ul className="mt-4 divide-y">
                  {materias.map((linha) => {
                    const materia = um(linha.materia);
                    return (
                      <li key={materia?.id ?? linha.ordem} className="flex items-center justify-between gap-3 py-3">
                        <div>
                          <p className="font-medium">{materia?.nome ?? "Matéria"}</p>
                          <p className="text-xs text-muted-foreground">{ROTULO[linha.status]}</p>
                        </div>
                        {linha.status !== "bloqueada" && materia ? (
                          <Link href={`/meus-cursos/${matricula.id}/${materia.id}`} className="text-sm text-primary">
                            Abrir
                          </Link>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
