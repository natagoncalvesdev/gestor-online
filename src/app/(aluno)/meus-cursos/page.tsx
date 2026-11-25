import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
import { PageTitle } from "@/components/page-title";
import { CapaProduto } from "@/components/loja/capa-produto";
import { capasDasMaterias } from "@/lib/materia-capa";
import type { ProdutoCategoriaLinha } from "@/lib/produto-categoria";
import { formatDate } from "@/lib/format";
import { lista, um } from "@/lib/relacao";

type MateriaProgresso = { total: number; feitas: number };

type MateriaLista = {
  chave: string;
  produtoId: string;
  matriculaId: string | null;
  materiaId: string;
  nome: string;
  produtoNome: string;
  href: string;
  capa: string | null;
  zoom: number;
  x: number;
  y: number;
  ordem: number;
  ordemMateria: number;
  expiracao: string | null;
  status: "bloqueada" | "liberada" | "concluida";
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

function compararMateria(a: MateriaLista, b: MateriaLista) {
  return (
    a.ordem - b.ordem ||
    a.ordemMateria - b.ordemMateria ||
    a.nome.localeCompare(b.nome, "pt-BR")
  );
}

function progressoDaMateria(materiaId: string, porMateria: Map<string, MateriaProgresso>) {
  return porMateria.get(materiaId) ?? { total: 0, feitas: 0 };
}

export default async function MeusCursosPage() {
  const session = await requireAluno();
  const supabase = await createClient();
  const admin = createServiceRoleClient();
  const leitura = admin ?? supabase;
  const { data } = await supabase
    .from("matricula")
    .select(
      "id, status, data_criacao, produto:produto_id(id, nome, ordem), materias:matricula_materia(ordem, status, materia_id, data_expiracao, materia:materia_id(nome))",
    )
    .eq("aluno_id", session.user.id)
    .neq("status", "cancelada")
    .order("data_criacao", { ascending: false });

  const matriculas = data ?? [];
  const { data: abertos } = admin
    ? await admin
        .from("produto")
        .select("id, nome, ordem, materias:produto_materia(ordem, materia_id, materia:materia_id(nome))")
        .eq("para_todos", true)
        .eq("ativo", true)
        .order("ordem")
    : { data: [] };

  const materiasLista: MateriaLista[] = [];
  const idsMatricula = new Set<string>();

  for (const matricula of matriculas) {
    const produto = um(
      matricula.produto as
        | { id: string; nome: string; ordem: number }
        | { id: string; nome: string; ordem: number }[]
        | null,
    );
    if (!produto) continue;
    idsMatricula.add(produto.id);
    const materias = lista(
      matricula.materias as {
        ordem: number;
        status: "bloqueada" | "liberada" | "concluida" | "desmatriculada";
        materia_id: string;
        data_expiracao: string | null;
        materia: { nome: string } | { nome: string }[] | null;
      }[],
    )
      .filter((linha) => linha.status !== "desmatriculada")
      .sort((a, b) => a.ordem - b.ordem);

    for (const linha of materias) {
      const materia = um(linha.materia);
      const nomeMateria = materia?.nome?.trim() || produto.nome;
      materiasLista.push({
        chave: `${matricula.id}-${linha.materia_id}`,
        produtoId: produto.id,
        matriculaId: matricula.id,
        materiaId: linha.materia_id,
        nome: nomeMateria,
        produtoNome: produto.nome,
        href: `/meus-cursos/${matricula.id}/${linha.materia_id}`,
        capa: null,
        zoom: 1,
        x: 0,
        y: 0,
        ordem: Number(produto.ordem ?? 0),
        ordemMateria: linha.ordem,
        expiracao: linha.data_expiracao,
        status: linha.status === "concluida" ? "concluida" : linha.status === "liberada" ? "liberada" : "bloqueada",
      });
    }
  }

  for (const produto of abertos ?? []) {
    if (idsMatricula.has(produto.id)) continue;
    const materias = lista(
      produto.materias as {
        ordem: number;
        materia_id: string;
        materia: { nome: string } | { nome: string }[] | null;
      }[] | null,
    ).sort((a, b) => a.ordem - b.ordem);
    for (const linha of materias) {
      const materia = um(linha.materia);
      const nomeMateria = materia?.nome?.trim() || produto.nome;
        materiasLista.push({
          chave: `aberto-${linha.materia_id}`,
          produtoId: produto.id,
          matriculaId: null,
          materiaId: linha.materia_id,
          nome: nomeMateria,
          produtoNome: produto.nome,
          href: `/meus-cursos/aberto/${linha.materia_id}`,
          capa: null,
          zoom: 1,
          x: 0,
          y: 0,
          ordem: Number(produto.ordem ?? 0),
          ordemMateria: linha.ordem,
          expiracao: null,
          status: "liberada",
      });
    }
  }

  const produtoIds = [...new Set(materiasLista.map((item) => item.produtoId))];
  const materiaIds = [...new Set(materiasLista.map((item) => item.materiaId))];
  const capasPorMateria = await capasDasMaterias(leitura, materiaIds);
  for (const item of materiasLista) {
    const capa = capasPorMateria.get(item.materiaId);
    if (capa) {
      item.capa = capa.capa;
      item.zoom = capa.zoom;
      item.x = capa.x;
      item.y = capa.y;
    }
  }
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
  const grupos = new Map<string, { categoria: ProdutoCategoriaLinha; materias: MateriaLista[] }>();
  const semCategoria: MateriaLista[] = [];

  for (const item of materiasLista) {
    const raizes = new Map<string, ProdutoCategoriaLinha>();
    for (const categoriaId of categoriasPorProduto.get(item.produtoId) ?? []) {
      const raiz = raizDaCategoria(linhasCategoria, categoriaId);
      if (!raiz || raiz.slug === "sem-categoria") continue;
      raizes.set(raiz.id, raiz);
    }
    if (raizes.size === 0) {
      semCategoria.push(item);
      continue;
    }
    for (const raiz of raizes.values()) {
      const grupo = grupos.get(raiz.id) ?? { categoria: raiz, materias: [] };
      grupo.materias.push(item);
      grupos.set(raiz.id, grupo);
    }
  }

  const secoes = [...grupos.values()]
    .sort((a, b) => a.categoria.ordem - b.categoria.ordem || a.categoria.nome.localeCompare(b.categoria.nome, "pt-BR"))
    .map((secao) => ({ ...secao, materias: [...secao.materias].sort(compararMateria) }));
  if (semCategoria.length > 0) {
    secoes.push({
      categoria: { id: "outros", nome: "Outros", slug: "outros", descricao: "", pai_id: null, ordem: 999, ativo: true },
      materias: [...semCategoria].sort(compararMateria),
    });
  }

  return (
    <div>
      <PageTitle title="Meus cursos" />
      {materiasLista.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma matéria matriculada ainda. <Link href="/loja">Ver a loja</Link>.
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {secoes.map((secao) => (
            <section key={secao.categoria.id}>
              <h2 className="mb-4 text-xl font-semibold">{secao.categoria.nome}</h2>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {secao.materias.map((item) => {
                  const progresso = progressoDaMateria(item.materiaId, porMateria);
                  const percentual = progresso.total === 0 ? 0 : Math.round((progresso.feitas / progresso.total) * 100);
                  const rotuloStatus =
                    item.status === "concluida"
                      ? "Concluída"
                      : item.status === "bloqueada"
                        ? "Aguardando liberação"
                        : null;
                  return (
                    <Link
                      key={`${secao.categoria.id}-${item.chave}`}
                      href={item.href}
                      className="group flex flex-col rounded-2xl border bg-card p-3 shadow-sm"
                    >
                      <div className="overflow-hidden rounded-xl">
                        <div className="transition-transform duration-300 group-hover:scale-110">
                          {item.capa ? (
                            <CapaProduto src={item.capa} zoom={item.zoom} x={item.x} y={item.y} proporcao="aspect-square w-full" />
                          ) : (
                            <div className="aspect-square w-full bg-secondary" />
                          )}
                        </div>
                      </div>
                      <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug">{item.nome}</h3>
                      {item.produtoNome !== item.nome ? (
                        <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{item.produtoNome}</p>
                      ) : null}
                      {rotuloStatus ? (
                        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{rotuloStatus}</p>
                      ) : null}
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${percentual}%` }} />
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{percentual}%</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold">
                        {progresso.feitas} de {progresso.total} etapas concluídas
                      </p>
                      {item.status !== "bloqueada" && item.expiracao ? (
                        <p className="mt-1 text-sm text-muted-foreground">Válido até {formatDate(item.expiracao)}</p>
                      ) : null}
                      <span className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                        Acessar matéria
                      </span>
                    </Link>
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
