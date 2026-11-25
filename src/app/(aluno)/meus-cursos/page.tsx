import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
import { PageTitle } from "@/components/page-title";
import { CapaProduto } from "@/components/loja/capa-produto";
import { urlImagemProduto } from "@/lib/produto-imagem";
import type { ProdutoCategoriaLinha } from "@/lib/produto-categoria";
import { lista, um } from "@/lib/relacao";

type MateriaProgresso = { total: number; feitas: number };

type CursoLista = {
  id: string;
  nome: string;
  href: string | null;
  capa: string | null;
  zoom: number;
  x: number;
  y: number;
  materiaIds: string[];
  ordem: number;
};

function raizDaCategoria(categorias: ProdutoCategoriaLinha[], id: string) {
  const porId = new Map(categorias.map((item) => [item.id, item]));
  let atual = porId.get(id);
  let passos = 0;
  while (atual?.pai_id && passos < 32) {
    atual = porId.get(atual.pai_id);
    passos += 1;
  }
  return atual ?? null;
}

function compararCurso(a: CursoLista, b: CursoLista) {
  return a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR");
}

function somarProgresso(ids: string[], porMateria: Map<string, MateriaProgresso>) {
  return ids.reduce(
    (acc, id) => {
      const item = porMateria.get(id);
      acc.total += item?.total ?? 0;
      acc.feitas += item?.feitas ?? 0;
      return acc;
    },
    { total: 0, feitas: 0 },
  );
}

export default async function MeusCursosPage() {
  const session = await requireAluno();
  const supabase = await createClient();
  const admin = createServiceRoleClient();
  const leitura = admin ?? supabase;
  const { data } = await supabase
    .from("matricula")
    .select("id, status, produto:produto_id(id, nome, ordem, imagem_path, imagem_zoom, imagem_x, imagem_y), materias:matricula_materia(ordem, status, materia_id)")
    .eq("aluno_id", session.user.id)
    .neq("status", "cancelada")
    .order("data_criacao", { ascending: false });

  const matriculas = data ?? [];
  const { data: abertos } = admin
    ? await admin
        .from("produto")
        .select("id, nome, ordem, imagem_path, imagem_zoom, imagem_x, imagem_y, materias:produto_materia(ordem, materia_id)")
        .eq("para_todos", true)
        .eq("ativo", true)
        .order("ordem")
    : { data: [] };

  const cursos: CursoLista[] = [];
  const idsMatricula = new Set<string>();

  for (const matricula of matriculas) {
    const produto = um(
      matricula.produto as
        | { id: string; nome: string; ordem: number; imagem_path: string | null; imagem_zoom: number; imagem_x: number; imagem_y: number }
        | { id: string; nome: string; ordem: number; imagem_path: string | null; imagem_zoom: number; imagem_x: number; imagem_y: number }[]
        | null,
    );
    if (!produto) continue;
    idsMatricula.add(produto.id);
    const materias = lista(
      matricula.materias as { ordem: number; status: "bloqueada" | "liberada" | "concluida"; materia_id: string }[],
    ).sort((a, b) => a.ordem - b.ordem);
    const aberta = materias.find((linha) => linha.status !== "bloqueada") ?? materias[0];
    cursos.push({
      id: produto.id,
      nome: produto.nome,
      href: aberta ? `/meus-cursos/${matricula.id}/${aberta.materia_id}` : null,
      capa: urlImagemProduto(produto.imagem_path),
      zoom: Number(produto.imagem_zoom ?? 1),
      x: Number(produto.imagem_x ?? 0),
      y: Number(produto.imagem_y ?? 0),
      materiaIds: materias.map((linha) => linha.materia_id),
      ordem: Number(produto.ordem ?? 0),
    });
  }

  for (const produto of abertos ?? []) {
    if (idsMatricula.has(produto.id)) continue;
    const materias = lista(produto.materias as { ordem: number; materia_id: string }[] | null).sort((a, b) => a.ordem - b.ordem);
    const primeira = materias[0];
    cursos.push({
      id: produto.id,
      nome: produto.nome,
      href: primeira ? `/meus-cursos/aberto/${primeira.materia_id}` : null,
      capa: urlImagemProduto(produto.imagem_path),
      zoom: Number(produto.imagem_zoom ?? 1),
      x: Number(produto.imagem_x ?? 0),
      y: Number(produto.imagem_y ?? 0),
      materiaIds: materias.map((linha) => linha.materia_id),
      ordem: Number(produto.ordem ?? 0),
    });
  }

  const produtoIds = cursos.map((curso) => curso.id);
  const materiaIds = [...new Set(cursos.flatMap((curso) => curso.materiaIds))];
  const [{ data: categorias }, { data: vinculos }] = await Promise.all([
    leitura.from("produto_categoria").select("id, nome, slug, descricao, pai_id, ordem, ativo").eq("ativo", true).order("ordem"),
    produtoIds.length
      ? leitura.from("produto_categoria_produto").select("produto_id, categoria_id").in("produto_id", produtoIds)
      : Promise.resolve({ data: [] as { produto_id: string; categoria_id: string }[] }),
  ]);
  const linhasCategoria = (categorias ?? []) as ProdutoCategoriaLinha[];
  const categoriasPorProduto = new Map<string, string[]>();
  for (const vinculo of (vinculos ?? []) as { produto_id: string; categoria_id: string }[]) {
    const listaAtual = categoriasPorProduto.get(vinculo.produto_id) ?? [];
    listaAtual.push(vinculo.categoria_id);
    categoriasPorProduto.set(vinculo.produto_id, listaAtual);
  }

  const porMateria = await progressoDasMaterias(leitura, supabase, session.user.id, materiaIds);
  const grupos = new Map<string, { categoria: ProdutoCategoriaLinha; cursos: CursoLista[] }>();
  const semCategoria: CursoLista[] = [];

  for (const curso of cursos) {
    const raizes = new Map<string, ProdutoCategoriaLinha>();
    for (const categoriaId of categoriasPorProduto.get(curso.id) ?? []) {
      const raiz = raizDaCategoria(linhasCategoria, categoriaId);
      if (!raiz || raiz.slug === "sem-categoria") continue;
      raizes.set(raiz.id, raiz);
    }
    if (raizes.size === 0) {
      semCategoria.push(curso);
      continue;
    }
    for (const raiz of raizes.values()) {
      const grupo = grupos.get(raiz.id) ?? { categoria: raiz, cursos: [] };
      grupo.cursos.push(curso);
      grupos.set(raiz.id, grupo);
    }
  }

  const secoes = [...grupos.values()]
    .sort((a, b) => a.categoria.ordem - b.categoria.ordem || a.categoria.nome.localeCompare(b.categoria.nome, "pt-BR"))
    .map((secao) => ({ ...secao, cursos: [...secao.cursos].sort(compararCurso) }));
  if (semCategoria.length > 0) {
    secoes.push({
      categoria: { id: "outros", nome: "Outros", slug: "outros", descricao: "", pai_id: null, ordem: 999, ativo: true },
      cursos: [...semCategoria].sort(compararCurso),
    });
  }

  return (
    <div>
      <PageTitle title="Meus cursos" />
      {cursos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum curso liberado ainda. <Link href="/loja">Ver a loja</Link>.
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {secoes.map((secao) => (
            <section key={secao.categoria.id}>
              <h2 className="mb-4 text-xl font-semibold">{secao.categoria.nome}</h2>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {secao.cursos.map((curso) => {
                  const progresso = somarProgresso(curso.materiaIds, porMateria);
                  const percentual = progresso.total === 0 ? 0 : Math.round((progresso.feitas / progresso.total) * 100);
                  const corpo = (
                    <>
                      <div className="overflow-hidden rounded-xl">
                        <div className="transition-transform duration-300 group-hover:scale-110">
                          {curso.capa ? (
                            <CapaProduto src={curso.capa} zoom={curso.zoom} x={curso.x} y={curso.y} proporcao="aspect-square w-full" />
                          ) : (
                            <div className="aspect-square w-full bg-secondary" />
                          )}
                        </div>
                      </div>
                      <h3 className="mt-3 line-clamp-2 min-h-12 text-base font-semibold leading-snug">{curso.nome}</h3>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${percentual}%` }} />
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{percentual}%</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold">
                        {progresso.feitas} de {progresso.total} etapas concluídas
                      </p>
                      <span className={`mt-4 inline-flex h-10 items-center justify-center rounded-md text-sm font-semibold ${curso.href ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                        Ver Curso
                      </span>
                    </>
                  );
                  return curso.href ? (
                    <Link key={`${secao.categoria.id}-${curso.id}`} href={curso.href} className="group flex flex-col rounded-2xl border bg-card p-3 shadow-sm">
                      {corpo}
                    </Link>
                  ) : (
                    <article key={`${secao.categoria.id}-${curso.id}`} className="flex flex-col rounded-2xl border bg-card p-3 shadow-sm">
                      {corpo}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

async function progressoDasMaterias(
  leitura: { from: (tabela: string) => any },
  aluno: { from: (tabela: string) => any },
  alunoId: string,
  materiaIds: string[],
) {
  const porMateria = new Map<string, MateriaProgresso>();
  for (const id of materiaIds) porMateria.set(id, { total: 0, feitas: 0 });
  if (materiaIds.length === 0) return porMateria;

  const { data: aulas } = await leitura.from("aula").select("id, materia_id").in("materia_id", materiaIds);
  const linhasAula = (aulas ?? []) as { id: string; materia_id: string }[];
  const aulaIds = linhasAula.map((aula) => aula.id);
  const materiaDaAula = new Map(linhasAula.map((aula) => [aula.id, aula.materia_id]));
  const { data: topicos } = aulaIds.length
    ? await leitura.from("topico").select("id, aula_id").in("aula_id", aulaIds)
    : { data: [] as { id: string; aula_id: string }[] };
  const linhasTopico = (topicos ?? []) as { id: string; aula_id: string }[];
  const { data: questionarios } = await leitura.from("questionario").select("id, materia_id").in("materia_id", materiaIds);
  const linhasQuestionario = (questionarios ?? []) as { id: string; materia_id: string }[];

  const topicoIds = linhasTopico.map((topico) => topico.id);
  const questionarioIds = linhasQuestionario.map((questionario) => questionario.id);
  const [{ data: progressoAula }, { data: progressoTopico }, { data: tentativas }] = await Promise.all([
    aulaIds.length
      ? aluno.from("aula_progresso").select("aula_id, video_concluido").eq("aluno_id", alunoId).in("aula_id", aulaIds)
      : Promise.resolve({ data: [] }),
    topicoIds.length
      ? aluno.from("topico_progresso").select("topico_id, video_concluido").eq("aluno_id", alunoId).in("topico_id", topicoIds)
      : Promise.resolve({ data: [] }),
    questionarioIds.length
      ? aluno.from("tentativa_prova").select("questionario_id").eq("aluno_id", alunoId).eq("aprovado", true).in("questionario_id", questionarioIds)
      : Promise.resolve({ data: [] }),
  ]);

  const aulasVistas = new Set(
    ((progressoAula ?? []) as { aula_id: string; video_concluido: boolean }[]).filter((item) => item.video_concluido).map((item) => item.aula_id),
  );
  const topicosVistos = new Set(
    ((progressoTopico ?? []) as { topico_id: string; video_concluido: boolean }[]).filter((item) => item.video_concluido).map((item) => item.topico_id),
  );
  const quizzesAprovados = new Set(
    ((tentativas ?? []) as { questionario_id: string | null }[]).map((item) => item.questionario_id).filter((id): id is string => Boolean(id)),
  );

  function contar(materiaId: string, feita: boolean) {
    const atual = porMateria.get(materiaId) ?? { total: 0, feitas: 0 };
    atual.total += 1;
    if (feita) atual.feitas += 1;
    porMateria.set(materiaId, atual);
  }

  for (const aula of linhasAula) contar(aula.materia_id, aulasVistas.has(aula.id));
  for (const topico of linhasTopico) {
    const materiaId = materiaDaAula.get(topico.aula_id);
    if (materiaId) contar(materiaId, topicosVistos.has(topico.id));
  }
  for (const questionario of linhasQuestionario) contar(questionario.materia_id, quizzesAprovados.has(questionario.id));
  return porMateria;
}
