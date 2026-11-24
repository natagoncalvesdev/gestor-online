import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";
import { MateriasOrdem } from "@/components/secretaria/materias-ordem";
import { Card, CardContent } from "@/components/ui/card";

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
    .select("id, nome, codigo, carga_horaria, ativo, aulas:aula(count), questoes:questao(count)")
    .order("ordem");

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Matérias</h1>
        <Link href="/secretaria/materias/nova" className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Nova matéria
        </Link>
      </div>
      <Card>
        <CardContent className="px-0">
          {(data ?? []).length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground">Nenhuma matéria cadastrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Ordem</th>
                    <th className="px-4 py-2 font-medium">Nome</th>
                    <th className="px-4 py-2 font-medium">Código</th>
                    <th className="px-4 py-2 font-medium">Carga horária</th>
                    <th className="px-4 py-2 font-medium">Aulas</th>
                    <th className="px-4 py-2 font-medium">Questões</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <MateriasOrdem
                    itens={(data ?? []).map((materia) => ({
                      id: materia.id,
                      nome: materia.nome,
                      codigo: materia.codigo,
                      carga: `${materia.carga_horaria}h`,
                      aulas: quantidade(materia.aulas as { count: number }[]),
                      questoes: quantidade(materia.questoes as { count: number }[]),
                      ativo: materia.ativo,
                    }))}
                  />
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
