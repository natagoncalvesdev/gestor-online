import { notFound } from "next/navigation";
import { ItensTrilha } from "@/components/estudo/itens-trilha";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
import { produtoAbertoDaMateria } from "@/lib/produto-aberto";
import { carregarTrilha } from "@/lib/trilha";

export default async function MateriaAbertaPage({ params }: { params: Promise<{ materiaId: string }> }) {
  const session = await requireAluno();
  const { materiaId } = await params;
  const supabase = await createClient();
  const { data: materia } = await supabase.from("materia").select("id, nome").eq("id", materiaId).eq("ativo", true).maybeSingle();
  const produto = materia ? await produtoAbertoDaMateria(supabase, materia.id) : null;
  if (!materia || !produto) notFound();
  const passos = await carregarTrilha(supabase, materia.id, session.user.id, "");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-primary">{produto.nome}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {produto.gratuita ? "Produto gratuito para todos os alunos." : "Produto disponível para todos os alunos."} O que ainda não chegou na data marcada fica bloqueado.
      </p>
      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        <ItensTrilha passos={passos} />
      </div>
    </div>
  );
}
