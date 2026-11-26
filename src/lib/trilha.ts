import { licaoLiberada, textoLiberacao } from "@/lib/ebd";

export type PassoTrilha = {
  chave: string;
  tipo: "secao" | "aula" | "topico" | "questionario";
  id: string;
  titulo: string;
  nivel: 0 | 1;
  href: string | null;
  aberta: boolean;
  concluida: boolean;
  quando: string | null;
};

type LinhaAula = {
  id: string;
  titulo: string;
  ordem: number;
  posicao: number | null;
  libera_em: string | null;
};

type LinhaSecao = {
  id: string;
  titulo: string;
  ordem: number;
  posicao: number | null;
};

type LinhaFilho = {
  id: string;
  aula_id: string;
  titulo: string;
  posicao: number;
  libera_em?: string | null;
};

type LinhaQuestionario = {
  id: string;
  aula_id: string | null;
  titulo: string;
  posicao: number;
  encerra_materia?: boolean;
};

type Consulta = {
  from: (tabela: string) => {
    select: (colunas: string) => any;
  };
};

function abertaEm(liberaEm: string | null | undefined) {
  return !liberaEm || licaoLiberada(liberaEm);
}

function quando(liberaEm: string | null | undefined, aberta: boolean) {
  if (aberta || !liberaEm) return null;
  return textoLiberacao(liberaEm);
}

export function montarTrilha(entrada: {
  aulas: LinhaAula[];
  secoes: LinhaSecao[];
  topicos: LinhaFilho[];
  questionarios: LinhaQuestionario[];
  aulasVistas: Set<string>;
  questionariosAprovados: Set<string>;
  consulta: string;
}): PassoTrilha[] {
  const filhos = new Map<string, { posicao: number; passo: PassoTrilha }[]>();
  const guardarFilho = (aulaId: string, posicao: number, passo: PassoTrilha) => {
    const lista = filhos.get(aulaId) ?? [];
    lista.push({ posicao, passo });
    filhos.set(aulaId, lista);
  };

  const aulasPorId = new Map(entrada.aulas.map((aula) => [aula.id, aula]));

  for (const topico of entrada.topicos) {
    const aula = aulasPorId.get(topico.aula_id);
    const aulaAberta = aula ? abertaEm(aula.libera_em) : true;
    const propria = abertaEm(topico.libera_em);
    const aberta = aulaAberta && propria;
    const bloqueio = !aulaAberta ? aula?.libera_em : topico.libera_em;
    guardarFilho(topico.aula_id, topico.posicao, {
      chave: `topico:${topico.id}`,
      tipo: "topico",
      id: topico.id,
      titulo: topico.titulo,
      nivel: 1,
      href: `/topico/${topico.id}${entrada.consulta}`,
      aberta,
      concluida: entrada.aulasVistas.has(topico.aula_id),
      quando: quando(bloqueio, aberta),
    });
  }

  for (const questionario of entrada.questionarios) {
    if (questionario.encerra_materia) continue;
    if (!questionario.aula_id) continue;
    const aula = aulasPorId.get(questionario.aula_id);
    const aberta = aula ? abertaEm(aula.libera_em) : true;
    guardarFilho(questionario.aula_id, questionario.posicao, {
      chave: `questionario:${questionario.id}`,
      tipo: "questionario",
      id: questionario.id,
      titulo: questionario.titulo,
      nivel: 1,
      href: `/questionario/${questionario.id}${entrada.consulta}`,
      aberta,
      concluida: entrada.questionariosAprovados.has(questionario.id),
      quando: quando(aula?.libera_em, aberta),
    });
  }

  const raiz: { posicao: number; ordem: number; passo: PassoTrilha; aulaId?: string }[] = [
    ...entrada.secoes.map((secao) => ({
      posicao: Number(secao.posicao ?? secao.ordem),
      ordem: secao.ordem,
      passo: {
        chave: `secao:${secao.id}`,
        tipo: "secao" as const,
        id: secao.id,
        titulo: secao.titulo,
        nivel: 0 as const,
        href: null,
        aberta: true,
        concluida: false,
        quando: null,
      },
    })),
    ...entrada.aulas.map((aula) => {
      const aberta = abertaEm(aula.libera_em);
      return {
        posicao: Number(aula.posicao ?? aula.ordem),
        ordem: aula.ordem,
        aulaId: aula.id,
        passo: {
          chave: `aula:${aula.id}`,
          tipo: "aula" as const,
          id: aula.id,
          titulo: aula.titulo,
          nivel: 0 as const,
          href: `/aula/${aula.id}${entrada.consulta}`,
          aberta,
          concluida: entrada.aulasVistas.has(aula.id),
          quando: quando(aula.libera_em, aberta),
        },
      };
    }),
    ...entrada.questionarios
      .filter((questionario) => !questionario.aula_id && !questionario.encerra_materia)
      .map((questionario) => ({
        posicao: questionario.posicao,
        ordem: questionario.posicao,
        passo: {
          chave: `questionario:${questionario.id}`,
          tipo: "questionario" as const,
          id: questionario.id,
          titulo: questionario.titulo,
          nivel: 0 as const,
          href: `/questionario/${questionario.id}${entrada.consulta}`,
          aberta: true,
          concluida: entrada.questionariosAprovados.has(questionario.id),
          quando: null,
        },
      })),
  ];

  raiz.sort((a, b) => a.posicao - b.posicao || a.ordem - b.ordem);

  const passos: PassoTrilha[] = [];
  for (const item of raiz) {
    passos.push(item.passo);
    if (!item.aulaId) continue;
    const lista = filhos.get(item.aulaId) ?? [];
    lista.sort((a, b) => a.posicao - b.posicao);
    for (const filho of lista) passos.push(filho.passo);
  }
  return passos;
}

export function passosContaveis(passos: PassoTrilha[]) {
  return passos.filter((passo) => passo.tipo !== "secao");
}

export function resumoProgresso(passos: PassoTrilha[]) {
  const lista = passosContaveis(passos);
  const feitas = lista.filter((passo) => passo.concluida).length;
  const total = lista.length;
  return {
    feitas,
    total,
    percentual: total === 0 ? 0 : Math.round((feitas / total) * 100),
  };
}

/** Lista a trilha sem links nem acesso (ex.: matéria ainda aguardando liberação na matrícula). */
export function passosApenasVisualizacao(passos: PassoTrilha[]): PassoTrilha[] {
  return passos.map((passo) =>
    passo.tipo === "secao"
      ? passo
      : {
          ...passo,
          aberta: false,
          href: null,
          quando: "Aguardando liberação da matéria",
        },
  );
}

export function proximoPasso(passos: PassoTrilha[]) {
  const lista = passosContaveis(passos);
  return lista.find((passo) => !passo.concluida && passo.aberta) ?? lista.find((passo) => !passo.concluida) ?? null;
}

export function vizinhos(passos: PassoTrilha[], tipo: PassoTrilha["tipo"], id: string) {
  const lista = passosContaveis(passos);
  const indice = lista.findIndex((passo) => passo.tipo === tipo && passo.id === id);
  return {
    anterior: indice > 0 ? lista[indice - 1] : null,
    seguinte: indice >= 0 && indice < lista.length - 1 ? lista[indice + 1] : null,
  };
}

export async function carregarTrilha(
  supabase: Consulta,
  materiaId: string,
  alunoId: string,
  consulta: string
): Promise<PassoTrilha[]> {
  const [{ data: aulas }, { data: secoes }, { data: questionarios }] = await Promise.all([
    supabase.from("aula").select("id, titulo, ordem, posicao, libera_em").eq("materia_id", materiaId).order("posicao"),
    supabase.from("aula_topico").select("id, titulo, ordem, posicao").eq("materia_id", materiaId).order("posicao"),
    supabase.from("questionario").select("id, aula_id, titulo, posicao, encerra_materia").eq("materia_id", materiaId).order("posicao"),
  ]);

  const linhasAula = (aulas ?? []) as LinhaAula[];
  const idsAula = linhasAula.map((aula) => aula.id);
  const { data: topicos } = idsAula.length
    ? await supabase.from("topico").select("id, aula_id, titulo, posicao, libera_em").in("aula_id", idsAula).order("posicao")
    : { data: [] as LinhaFilho[] };

  const linhasTopico = (topicos ?? []) as LinhaFilho[];
  const linhasQuestionario = (questionarios ?? []) as LinhaQuestionario[];
  const idsQuestionario = linhasQuestionario.map((questionario) => questionario.id);

  const [{ data: progressoAula }, { data: tentativas }, { data: provasEntregues }] = await Promise.all([
    idsAula.length
      ? supabase.from("aula_progresso").select("aula_id, video_concluido").eq("aluno_id", alunoId).in("aula_id", idsAula)
      : Promise.resolve({ data: [] }),
    idsQuestionario.length
      ? supabase
          .from("tentativa_prova")
          .select("questionario_id, aprovado")
          .eq("aluno_id", alunoId)
          .eq("aprovado", true)
          .in("questionario_id", idsQuestionario)
      : Promise.resolve({ data: [] }),
    idsQuestionario.length
      ? supabase
          .from("tentativa_prova")
          .select("questionario_id")
          .eq("aluno_id", alunoId)
          .not("entregue_em", "is", null)
          .in("questionario_id", idsQuestionario)
      : Promise.resolve({ data: [] }),
  ]);

  return montarTrilha({
    aulas: linhasAula,
    secoes: (secoes ?? []) as LinhaSecao[],
    topicos: linhasTopico,
    questionarios: linhasQuestionario,
    aulasVistas: new Set(
      ((progressoAula ?? []) as { aula_id: string; video_concluido: boolean }[])
        .filter((item) => item.video_concluido)
        .map((item) => item.aula_id)
    ),
    questionariosAprovados: new Set(
      [
        ...((tentativas ?? []) as { questionario_id: string | null }[]),
        ...((provasEntregues ?? []) as { questionario_id: string | null }[]),
      ]
        .map((item) => item.questionario_id)
        .filter((id): id is string => Boolean(id))
    ),
    consulta,
  });
}
