import { notFound } from "next/navigation";
import { InicioMateriaAluno } from "@/components/estudo/inicio-materia-aluno";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { capasDasMaterias } from "@/lib/materia-capa";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
import { produtoAbertoDaMateria } from "@/lib/produto-aberto";
import { tentativaProvaPendente } from "@/actions/estudo";
import { carregarPainelProva } from "@/lib/prova-painel";
import { carregarTrilha } from "@/lib/trilha";

export default async function MateriaAbertaPage({ params }: { params: Promise<{ materiaId: string }> }) {
  const session = await requireAluno();
  const { materiaId } = await params;
  const supabase = await createClient();
  const admin = createServiceRoleClient();
  const { data: materia } = await supabase.from("materia").select("id, nome").eq("id", materiaId).eq("ativo", true).maybeSingle();
  const produto = materia ? await produtoAbertoDaMateria(supabase, materia.id) : null;
  if (!materia || !produto) notFound();

  const leitura = admin ?? supabase;
  const capas = await capasDasMaterias(leitura, [materiaId]);
  const capa = capas.get(materiaId);
  const passos = await carregarTrilha(supabase, materia.id, session.user.id, "");
  const prova = await carregarPainelProva(supabase, session.user.id, materia.id, "", {
    nova: await tentativaProvaPendente(session.user.id, materia.id),
    bloqueada: false,
  });

  return (
    <InicioMateriaAluno
      nome={materia.nome}
      capa={capa?.capa ?? null}
      zoom={capa?.zoom}
      x={capa?.x}
      y={capa?.y}
      expiracao={null}
      passos={passos}
      prova={prova}
    />
  );
}