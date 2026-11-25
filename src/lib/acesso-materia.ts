import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
import { produtoAbertoDaMateria } from "@/lib/produto-aberto";
import { um } from "@/lib/relacao";

export async function acessoMateria(materiaId: string, matriculaInformada?: string) {
  const session = await requireAluno();
  const supabase = await createClient();
  const { data: acessos } = await supabase
    .from("matricula_materia")
    .select("status, matricula_id, materia:materia_id(nome), matricula:matricula_id(aluno_id, produto:produto_id(nome))")
    .eq("materia_id", materiaId)
    .neq("status", "bloqueada");

  const abertos = (acessos ?? []).filter((item) => {
    const matricula = um(
      item.matricula as
        | { aluno_id: string; produto: { nome: string } | { nome: string }[] | null }
        | { aluno_id: string; produto: { nome: string } | { nome: string }[] | null }[]
        | null
    );
    return matricula?.aluno_id === session.user.id;
  });
  const acesso = abertos.find((item) => item.matricula_id === matriculaInformada) ?? abertos[0];
  const { data: materiaNome } = acesso
    ? { data: null }
    : await supabase.from("materia").select("nome").eq("id", materiaId).eq("ativo", true).maybeSingle();
  const produtoAberto = acesso ? null : await produtoAbertoDaMateria(supabase, materiaId);

  if (!acesso && (!materiaNome || !produtoAberto)) return null;

  const produto = acesso
    ? um(
        um(
          acesso.matricula as
            | { produto: { nome: string } | { nome: string }[] | null }
            | { produto: { nome: string } | { nome: string }[] | null }[]
            | null
        )?.produto ?? null
      )
    : null;
  const materia = acesso ? um(acesso.materia as { nome: string } | { nome: string }[] | null) : materiaNome;
  const matriculaId = acesso ? (acesso.matricula_id as string) : null;

  return {
    session,
    supabase,
    matriculaId,
    produtoNome: produto?.nome ?? produtoAberto?.nome ?? "Curso",
    materiaNome: materia?.nome ?? "Matéria",
    voltar: matriculaId ? `/meus-cursos/${matriculaId}/${materiaId}` : `/meus-cursos/aberto/${materiaId}`,
    consulta: matriculaId ? `?matricula=${matriculaId}` : "",
  };
}
