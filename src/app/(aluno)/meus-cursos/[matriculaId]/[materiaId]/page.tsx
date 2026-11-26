import { notFound } from "next/navigation";
import { InicioMateriaAluno } from "@/components/estudo/inicio-materia-aluno";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { capasDasMaterias } from "@/lib/materia-capa";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
import { um } from "@/lib/relacao";
import { tentativaProvaPendente } from "@/actions/estudo";
import { carregarPainelProva } from "@/lib/prova-painel";
import { carregarTrilha, passosApenasVisualizacao } from "@/lib/trilha";

export default async function MateriaAlunoPage({
  params,
}: {
  params: Promise<{ matriculaId: string; materiaId: string }>;
}) {
  const { matriculaId, materiaId } = await params;
  const session = await requireAluno();
  const supabase = await createClient();
  const admin = createServiceRoleClient();
  const { data: matricula } = await supabase
    .from("matricula")
    .select("id")
    .eq("id", matriculaId)
    .eq("aluno_id", session.user.id)
    .maybeSingle();
  if (!matricula) notFound();

  const { data: acesso } = await supabase
    .from("matricula_materia")
    .select("status, data_expiracao, materia:materia_id(nome)")
    .eq("matricula_id", matriculaId)
    .eq("materia_id", materiaId)
    .maybeSingle();
  if (!acesso) notFound();

  const materia = um(acesso.materia as { nome: string } | { nome: string }[] | null);
  const nome = materia?.nome?.trim() || "Matéria";
  const expiracao = (acesso.data_expiracao as string | null) || null;
  const bloqueada = acesso.status === "bloqueada";
  const mostrarValidade = !bloqueada && expiracao;

  const leitura = admin ?? supabase;
  const capas = await capasDasMaterias(leitura, [materiaId]);
  const capa = capas.get(materiaId);

  const consulta = `?matricula=${matriculaId}`;
  const passosBrutos = await carregarTrilha(supabase, materiaId, session.user.id, consulta);
  const passos = bloqueada ? passosApenasVisualizacao(passosBrutos) : passosBrutos;
  const prova = await carregarPainelProva(supabase, session.user.id, materiaId, consulta, {
    nova: await tentativaProvaPendente(session.user.id, materiaId),
    bloqueada,
  });

  return (
    <InicioMateriaAluno
      nome={nome}
      capa={capa?.capa ?? null}
      zoom={capa?.zoom}
      x={capa?.x}
      y={capa?.y}
      expiracao={mostrarValidade ? expiracao : null}
      passos={passos}
      prova={prova}
    />
  );
}