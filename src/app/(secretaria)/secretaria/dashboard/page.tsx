import { createClient } from "@/lib/supabase/server";
import { requireInterno } from "@/lib/session";
import { PageTitle } from "@/components/page-title";

export default async function DashboardPage() {
  await requireInterno();
  const supabase = await createClient();
  const [alunos, matriculas, pedidos] = await Promise.all([
    supabase.from("aluno").select("id", { count: "exact", head: true }),
    supabase.from("matricula").select("id", { count: "exact", head: true }).eq("status", "ativa"),
    supabase.from("pedido").select("id", { count: "exact", head: true }).eq("status", "pago"),
  ]);

  const cartoes = [
    { rotulo: "Alunos", valor: alunos.count ?? 0 },
    { rotulo: "Matrículas ativas", valor: matriculas.count ?? 0 },
    { rotulo: "Pedidos pagos", valor: pedidos.count ?? 0 },
  ];

  return (
    <div>
      <PageTitle title="Início" description="Acompanhe alunos, matrículas e pedidos." />
      <div className="grid gap-4 sm:grid-cols-3">
        {cartoes.map((cartao) => (
          <div key={cartao.rotulo} className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{cartao.rotulo}</p>
            <p className="mt-2 text-3xl font-semibold">{cartao.valor}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
