export type TentativaPainelProva = {
  id: string;
  href: string;
  nota: number;
  acertos: number;
  total: number;
  aprovado: boolean;
  codigo: string | null;
  entregueEm: string | null;
};

export type PainelProvaMateria = {
  titulo: string;
  hrefNova: string | null;
  hrefContinuar: string | null;
  tentativas: TentativaPainelProva[];
};

function hrefQuestionario(questionarioId: string, consulta: string, tentativa?: string) {
  const base = `/questionario/${questionarioId}${consulta}`;
  if (!tentativa) return base;
  return `${base}${consulta.includes("?") ? "&" : "?"}tentativa=${tentativa}`;
}

export async function carregarPainelProva(
  supabase: { from: (tabela: string) => any },
  alunoId: string,
  materiaId: string,
  consulta: string,
  opcoes: { nova: boolean; bloqueada: boolean }
): Promise<PainelProvaMateria | null> {
  const { data: prova } = await supabase
    .from("questionario")
    .select("id, titulo")
    .eq("materia_id", materiaId)
    .eq("encerra_materia", true)
    .order("posicao")
    .limit(1)
    .maybeSingle();
  if (!prova) return null;

  const [{ data: tentativas }, { data: aberta }] = await Promise.all([
    supabase
      .from("tentativa_prova")
      .select("id, entregue_em, nota, acertos, total, aprovado, codigo")
      .eq("aluno_id", alunoId)
      .eq("questionario_id", prova.id)
      .not("entregue_em", "is", null)
      .order("entregue_em", { ascending: true }),
    supabase
      .from("tentativa_prova")
      .select("id")
      .eq("aluno_id", alunoId)
      .eq("questionario_id", prova.id)
      .is("entregue_em", null)
      .not("iniciada_em", "is", null)
      .maybeSingle(),
  ]);

  const bloqueada = opcoes.bloqueada;
  return {
    titulo: prova.titulo as string,
    hrefNova:
      !bloqueada && !aberta && (opcoes.nova || (tentativas ?? []).length === 0)
        ? hrefQuestionario(prova.id as string, consulta)
        : null,
    hrefContinuar: !bloqueada && aberta ? hrefQuestionario(prova.id as string, consulta) : null,
    tentativas: ((tentativas ?? []) as {
      id: string;
      entregue_em: string | null;
      nota: number | null;
      acertos: number | null;
      total: number | null;
      aprovado: boolean | null;
      codigo: string | null;
    }[]).map((item) => ({
      id: item.id,
      href: bloqueada ? "" : hrefQuestionario(prova.id as string, consulta, item.id),
      nota: Number(item.nota ?? 0),
      acertos: Number(item.acertos ?? 0),
      total: Number(item.total ?? 0),
      aprovado: Boolean(item.aprovado),
      codigo: item.codigo,
      entregueEm: item.entregue_em,
    })),
  };
}
