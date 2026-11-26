import Link from "next/link";
import { notFound } from "next/navigation";
import {
  atualizarAluno,
  destacarObservacao,
  excluirDocumento,
  salvarDocumento,
  salvarObservacao,
} from "@/actions/alunos";
import { ActionForm } from "@/components/action-form";
import { CpfInput } from "@/components/cpf-input";
import type { TentativaProvaInfo } from "@/components/estudo/nota-tentativas";
import { CursosAluno, type LinhaCursoAluno } from "@/components/secretaria/cursos-aluno";
import { EnderecoAlunoAbas } from "@/components/secretaria/endereco-aluno-abas";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { mesclarAlunoEndereco } from "@/lib/aluno-endereco";
import { formatBRL, formatDate, formatDateTime } from "@/lib/format";
import { lista, um } from "@/lib/relacao";
import { createClient } from "@/lib/supabase/server";
import { requireInterno } from "@/lib/session";

const ROTULO_PEDIDO = {
  pendente: "Aguardando pagamento",
  pago: "Pago",
  cancelado: "Cancelado",
  recusado: "Recusado",
} as const;

export default async function AlunoDetalhePage({
  params,
}: {
  params: Promise<{ alunoId: string }>;
}) {
  const session = await requireInterno();
  const { alunoId } = await params;
  const supabase = await createClient();
  const { data: alunoBruto } = await supabase
    .from("aluno")
    .select("*, endereco_aluno(*)")
    .eq("id", alunoId)
    .maybeSingle();
  if (!alunoBruto) notFound();
  const aluno = mesclarAlunoEndereco(alunoBruto);

  const [{ data: matriculas }, { data: documentos }, { data: produtosAtivos }, { data: observacoes }, { data: pedidos }, { data: aulas }, { data: questionarios }, { data: progresso }, { data: tentativas }] =
    await Promise.all([
      supabase
        .from("matricula")
        .select(
          "id, status, data_criacao, produto_id, produto:produto_id(nome, data_criacao, agrupador, gratuita), materias:matricula_materia(id, ordem, status, materia_id, liberada_em, data_expiracao, conclusao_manual, materia:materia_id(nome, slug, ordem))",
        )
        .eq("aluno_id", alunoId),
      supabase
        .from("documento_emitido")
        .select("id, tipo, informacao, codigo, data_emissao, arquivo_path, arquivo_nome")
        .eq("aluno_id", alunoId)
        .order("data_emissao", { ascending: false }),
      supabase
        .from("produto")
        .select("id, nome, agrupador, gratuita, vinculos:produto_materia(ordem, materia:materia_id(id, nome, slug))")
        .eq("ativo", true)
        .order("nome"),
      supabase
        .from("observacao_aluno")
        .select("id, texto, autor_nome, destaque, data_criacao")
        .eq("aluno_id", alunoId)
        .order("destaque", { ascending: false })
        .order("data_criacao", { ascending: false }),
      supabase
        .from("pedido")
        .select("id, status, valor_total, data_criacao, itens:pedido_item(nome)")
        .eq("aluno_id", alunoId)
        .order("data_criacao", { ascending: false }),
      supabase.from("aula").select("id, materia_id"),
      supabase.from("questionario").select("id, materia_id"),
      supabase.from("aula_progresso").select("aula_id, video_concluido").eq("aluno_id", alunoId),
      supabase
        .from("tentativa_prova")
        .select("id, matricula_id, materia_id, questionario_id, aprovado, nota, acertos, total, data_criacao, entregue_em, codigo, iniciada_em")
        .eq("aluno_id", alunoId)
        .order("data_criacao", { ascending: false }),
    ]);

  const aulasPorMateria = new Map<string, string[]>();
  for (const aula of aulas ?? []) {
    const listaAulas = aulasPorMateria.get(aula.materia_id) ?? [];
    listaAulas.push(aula.id);
    aulasPorMateria.set(aula.materia_id, listaAulas);
  }
  const quizzesPorMateria = new Map<string, string[]>();
  for (const questionario of questionarios ?? []) {
    const listaQuizzes = quizzesPorMateria.get(questionario.materia_id) ?? [];
    listaQuizzes.push(questionario.id);
    quizzesPorMateria.set(questionario.materia_id, listaQuizzes);
  }
  const vistas = new Set((progresso ?? []).filter((item) => item.video_concluido).map((item) => item.aula_id));
  const materiaDoQuestionario = new Map<string, string>();
  for (const questionario of questionarios ?? []) {
    materiaDoQuestionario.set(questionario.id as string, questionario.materia_id as string);
  }
  const tentativasPorMateria = new Map<string, TentativaProvaInfo[]>();
  const tentativasPorChave = new Map<string, TentativaProvaInfo[]>();
  const tentativaPendentePorChave = new Set<string>();
  for (const item of tentativas ?? []) {
    const chave = `${item.matricula_id}:${item.materia_id}`;
    if (item.nota == null && !item.entregue_em) {
      tentativaPendentePorChave.add(chave);
      continue;
    }
    const info: TentativaProvaInfo = {
      id: item.id as string,
      href: `/secretaria/alunos/${alunoId}/prova/${item.id}`,
      codigo: (item.codigo as string | null) ?? null,
      nota: Number(item.nota ?? 0),
      acertos: Number(item.acertos ?? 0),
      total: Number(item.total ?? 0),
      aprovado: Boolean(item.aprovado),
      entregueEm: (item.entregue_em as string | null) ?? (item.data_criacao as string | null),
    };
    const materiaId = (item.materia_id as string | null) ?? materiaDoQuestionario.get(item.questionario_id as string);
    if (materiaId) {
      const listaMateria = tentativasPorMateria.get(materiaId) ?? [];
      listaMateria.push(info);
      tentativasPorMateria.set(materiaId, listaMateria);
    }
    const listaChave = tentativasPorChave.get(chave) ?? [];
    listaChave.push(info);
    tentativasPorChave.set(chave, listaChave);
  }
  const telefone = String(aluno.telefone ?? "");
  const digitos = telefone.replace(/\D/g, "");
  const whatsapp = digitos ? `https://wa.me/55${digitos}` : null;
  const produtosJaMatriculados = new Set(
    (matriculas ?? [])
      .filter((item) => item.status !== "cancelada")
      .map((item) => item.produto_id as string),
  );
  const materiasJaMatriculadas = new Set<string>();
  for (const matricula of matriculas ?? []) {
    if (matricula.status === "cancelada") continue;
    for (const vinculo of lista(
      matricula.materias as { materia_id: string; status: string }[] | null,
    )) {
      if (vinculo.status !== "desmatriculada") {
        materiasJaMatriculadas.add(vinculo.materia_id);
      }
    }
  }
  type ProdutoLista = {
    id: string;
    nome: string;
    agrupador: boolean;
    gratuita: boolean;
    vinculos:
      | {
          ordem: number;
          materia: { id: string; nome: string; slug: string } | { id: string; nome: string; slug: string }[] | null;
        }[]
      | null;
  };
  const produtos = (produtosAtivos ?? []) as ProdutoLista[];

  const materiasGratuitas = new Set<string>();
  for (const produto of produtos) {
    if (!produto.gratuita) continue;
    for (const vinculo of lista(produto.vinculos)) {
      const materia = um(vinculo.materia);
      if (materia) materiasGratuitas.add(materia.id);
    }
  }
  const temMaterias = (produto: ProdutoLista) => lista(produto.vinculos).length > 0;

  type MateriaDisponivel = {
    materiaId: string;
    materiaNome: string;
    produtoId: string;
    produtoNome: string;
    ordem: number;
  };
  const materiasDisponiveis: MateriaDisponivel[] = [];
  for (const produto of produtos) {
    if (produto.agrupador) continue;
    for (const vinculo of lista(produto.vinculos).sort((a, b) => a.ordem - b.ordem)) {
      const materia = um(vinculo.materia);
      if (!materia) continue;
      if (materiasJaMatriculadas.has(materia.id)) continue;
      materiasDisponiveis.push({
        materiaId: materia.id,
        materiaNome: materia.nome,
        produtoId: produto.id,
        produtoNome: produto.nome,
        ordem: vinculo.ordem,
      });
    }
  }
  materiasDisponiveis.sort(
    (a, b) => a.materiaNome.localeCompare(b.materiaNome, "pt-BR") || a.produtoNome.localeCompare(b.produtoNome, "pt-BR"),
  );

  let sequenciaAtiva: { matriculaId: string; nome: string } | null = null;
  for (const matricula of matriculas ?? []) {
    if (matricula.status !== "ativa") continue;
    const produto = um(
      matricula.produto as { nome: string; agrupador: boolean } | { nome: string; agrupador: boolean }[] | null,
    );
    if (!produto?.agrupador) continue;
    sequenciaAtiva = { matriculaId: matricula.id as string, nome: produto.nome };
    break;
  }

  const sequenciasDisponiveis = sequenciaAtiva
    ? []
    : produtos
        .filter((produto) => produto.agrupador && !produtosJaMatriculados.has(produto.id) && temMaterias(produto))
        .map((produto) => ({ id: produto.id, nome: produto.nome }));

  const notaProvaPorMatriculaMateria = new Map<string, string>();
  const aprovacaoProvaPorMatriculaMateria = new Map<string, boolean>();
  for (const tentativa of tentativas ?? []) {
    if (tentativa.nota == null && !tentativa.entregue_em) continue;
    const matriculaId = tentativa.matricula_id as string;
    const questionarioId = tentativa.questionario_id as string | null;
    const materiaIdTentativa = tentativa.materia_id as string;
    const materiasAlvo: string[] = [];
    if (questionarioId) {
      for (const [materiaId, idsQuiz] of quizzesPorMateria.entries()) {
        if (idsQuiz.includes(questionarioId)) materiasAlvo.push(materiaId);
      }
    } else if (materiaIdTentativa) {
      materiasAlvo.push(materiaIdTentativa);
    }
    const nota = Number(tentativa.nota);
    const notaTexto = Number.isFinite(nota)
      ? nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : "—";
    for (const materiaId of materiasAlvo) {
      const chave = `${matriculaId}:${materiaId}`;
      if (!notaProvaPorMatriculaMateria.has(chave)) {
        notaProvaPorMatriculaMateria.set(chave, notaTexto);
        aprovacaoProvaPorMatriculaMateria.set(chave, Boolean(tentativa.aprovado));
      }
    }
  }

  const linhasMaterias: LinhaCursoAluno[] = [];
  for (const matricula of (matriculas ?? []).filter((item) => item.status !== "cancelada")) {
    const produto = um(
      matricula.produto as
        | { nome: string; data_criacao: string; agrupador: boolean; gratuita: boolean }
        | { nome: string; data_criacao: string; agrupador: boolean; gratuita: boolean }[]
        | null,
    );
    const statusMatricula = matricula.status as LinhaCursoAluno["statusMatricula"];
    const materias = lista(
      matricula.materias as {
        id: string;
        ordem: number;
        status: string;
        materia_id: string;
        liberada_em: string | null;
        data_expiracao: string | null;
        conclusao_manual: boolean;
        materia: { nome: string; slug: string; ordem: number } | { nome: string; slug: string; ordem: number }[] | null;
      }[],
    );

    materias.forEach((vinculo, indice) => {
      const materia = um(vinculo.materia);
      const materiaId = vinculo.materia_id;
      const gratuita = materiasGratuitas.has(materiaId) || Boolean(produto?.gratuita);
      const ordemMateria = Number(materia?.ordem ?? 0);
      const ids = aulasPorMateria.get(materiaId) ?? [];
      const chaveProva = `${matricula.id}:${materiaId}`;
      const tentativasProva =
        (tentativasPorMateria.get(materiaId)?.length
          ? tentativasPorMateria.get(materiaId)
          : tentativasPorChave.get(chaveProva)) ?? [];
      const pendente = tentativaPendentePorChave.has(chaveProva) ? 1 : 0;
      const total = ids.length + tentativasProva.length + pendente;
      const statusMateria = vinculo.status as LinhaCursoAluno["statusMateria"];
      const conclusaoManual = Boolean(vinculo.conclusao_manual);
      let feitas = ids.filter((id) => vistas.has(id)).length + tentativasProva.length;
      if (statusMateria === "concluida" && pendente === 0) feitas = total;
      const mostrarNotaProva = !conclusaoManual;
      const ultimaTentativa = tentativasProva[0];
      const notaTexto =
        notaProvaPorMatriculaMateria.get(chaveProva) ??
        (ultimaTentativa
          ? ultimaTentativa.nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
          : undefined);
      const aprovada =
        aprovacaoProvaPorMatriculaMateria.get(chaveProva) ?? ultimaTentativa?.aprovado;

      linhasMaterias.push({
        id: vinculo.id,
        matriculaId: matricula.id as string,
        produtoId: matricula.produto_id as string,
        produtoNome: produto?.nome ?? "Produto",
        materiaId,
        nome: materia?.nome ?? "Matéria",
        statusMateria,
        statusMatricula,
        feitas,
        total,
        dataMatricula:
          statusMateria === "bloqueada"
            ? null
            : ((vinculo.liberada_em as string | null) ?? (matricula.data_criacao as string)),
        dataPublicacao: (produto?.data_criacao ?? matricula.data_criacao) as string,
        prova: mostrarNotaProva ? notaTexto ?? "—" : "—",
        resultadoProva:
          mostrarNotaProva && aprovada != null ? (aprovada ? "aprovado" : "reprovado") : null,
        expiracao: vinculo.data_expiracao,
        mostrarAcoesProduto: indice === 0,
        gratuita,
        ordemMateria,
        emAndamento:
          statusMateria === "liberada" &&
          (ids.some((id) => vistas.has(id)) || tentativasProva.length > 0),
        tentativasProva,
        provaNovaTentativa: tentativaPendentePorChave.has(chaveProva),
      });
    });
  }

  const sequenciasMatriculadas: {
    matriculaId: string;
    produtoId: string;
    nome: string;
    feitas: number;
    total: number;
    percentual: number;
  }[] = [];

  for (const matricula of (matriculas ?? []).filter((item) => item.status !== "cancelada")) {
    const produto = um(
      matricula.produto as
        | { nome: string; data_criacao: string; agrupador: boolean }
        | { nome: string; data_criacao: string; agrupador: boolean }[]
        | null,
    );
    if (!produto?.agrupador) continue;
    const linhas = linhasMaterias.filter(
      (linha) => linha.matriculaId === matricula.id && linha.statusMateria !== "desmatriculada",
    );
    const feitas = linhas.filter((linha) => linha.statusMateria === "concluida").length;
    const total = linhas.length;
    sequenciasMatriculadas.push({
      matriculaId: matricula.id as string,
      produtoId: matricula.produto_id as string,
      nome: produto.nome,
      feitas,
      total,
      percentual: total === 0 ? 0 : Math.round((feitas / total) * 100),
    });
  }
  sequenciasMatriculadas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Editar aluno</h1>
        <Link
          href="/secretaria/alunos"
          className="inline-flex h-8 items-center rounded-md border bg-white px-3 text-xs font-medium hover:bg-secondary"
        >
          Voltar à lista
        </Link>
      </div>

      <ActionForm action={atualizarAluno} className="flex flex-col gap-6">
        <input type="hidden" name="id" value={aluno.id} />

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Informações do aluno</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Nome completo">
                    <Input name="nome" defaultValue={aluno.nome} required />
                  </Field>
                </div>
                <Field label="Nº do aluno">
                  <Input name="numero_aluno" defaultValue={aluno.numero_aluno} readOnly className="bg-muted text-muted-foreground" />
                </Field>
                <Field label="E-mail">
                  <Input value={aluno.email} readOnly className="bg-muted text-muted-foreground" />
                </Field>
                <Field label="CPF">
                  <CpfInput defaultValue={aluno.cpf} />
                </Field>
                <Field label="Nascimento">
                  <Input name="data_nascimento" type="date" defaultValue={aluno.data_nascimento} required />
                </Field>
                <Field label="Telefone">
                  <div className="flex items-center gap-2">
                    <Input name="telefone" defaultValue={telefone} className="max-w-[11.5rem]" />
                    {whatsapp ? (
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir WhatsApp"
                        aria-label="Abrir WhatsApp"
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-input bg-white hover:bg-secondary"
                      >
                        <IconeWhatsApp className="size-5 text-[#25D366]" />
                      </a>
                    ) : (
                      <span
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-dashed border-muted-foreground/30 bg-muted/30"
                        aria-hidden
                      >
                        <IconeWhatsApp className="size-5 text-muted-foreground/40" />
                      </span>
                    )}
                  </div>
                </Field>
                <Field label="Situação">
                  <Select name="status" defaultValue={aluno.status}>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </Select>
                </Field>
                <Field label="Atendente">
                  <Input name="atendente" defaultValue={aluno.atendente ?? ""} />
                </Field>
                <Field label="Indicador">
                  <Input name="indicador" defaultValue={aluno.indicador ?? ""} placeholder="Matrícula de quem indicou" />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader>
              <CardTitle>Endereços</CardTitle>
            </CardHeader>
            <CardContent>
              <EnderecoAlunoAbas enderecoEntrega={aluno.endereco_entrega} enderecoCobranca={aluno.endereco_cobranca} />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <SubmitButton size="sm">Salvar aluno</SubmitButton>
        </div>
      </ActionForm>

      <Card>
        <CardHeader>
          <CardTitle>Compras</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {(pedidos ?? []).length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground">Nenhuma compra registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium">Itens</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(pedidos ?? []).map((pedido) => {
                    const itens = lista(pedido.itens as { nome: string }[] | null)
                      .map((item) => item.nome)
                      .join(", ");
                    return (
                      <tr key={pedido.id} className="border-b last:border-0">
                        <td className="px-4 py-3 whitespace-nowrap tabular-nums text-muted-foreground">{formatDateTime(pedido.data_criacao)}</td>
                        <td className="px-4 py-3">{itens || "—"}</td>
                        <td className="px-4 py-3">{ROTULO_PEDIDO[pedido.status as keyof typeof ROTULO_PEDIDO]}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatBRL(pedido.valor_total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CursosAluno
        alunoId={aluno.id}
        cursos={linhasMaterias}
        materiasDisponiveis={materiasDisponiveis}
        sequenciasDisponiveis={sequenciasDisponiveis}
        sequenciaAtiva={sequenciaAtiva}
        sequenciasMatriculadas={sequenciasMatriculadas}
        podeEditarMatricula={session.user.papel === "admin"}
      />

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
          <CardDescription>Anotações internas da secretaria. O aluno não vê este histórico.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ActionForm action={salvarObservacao} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <input type="hidden" name="aluno_id" value={aluno.id} />
            <Field label="Nova observação">
              <Textarea name="texto" placeholder="Escreva uma observação…" rows={3} className="min-h-[4.5rem]" />
            </Field>
            <SubmitButton size="sm">Adicionar</SubmitButton>
          </ActionForm>
          {(observacoes ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma observação ainda.</p>
          ) : (
            <ul className="space-y-2">
              {(observacoes ?? []).map((nota) => (
                <li key={nota.id} className="flex flex-col gap-2 rounded-md border px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="whitespace-pre-wrap">{nota.texto}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(nota.data_criacao)}
                      {" · "}
                      {nota.autor_nome}
                      {nota.destaque ? " · Fixada" : ""}
                    </p>
                  </div>
                  <ActionForm action={destacarObservacao}>
                    <input type="hidden" name="id" value={nota.id} />
                    <input type="hidden" name="aluno_id" value={aluno.id} />
                    <input type="hidden" name="destaque" value={nota.destaque ? "1" : "0"} />
                    <SubmitButton variant="outline" size="sm">
                      {nota.destaque ? "Desafixar" : "Fixar"}
                    </SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentos emitidos</CardTitle>
          <CardDescription>Certificados, declarações e outros arquivos entregues ao aluno.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ActionForm action={salvarDocumento} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="aluno_id" value={aluno.id} />
            <Field label="Tipo de documento">
              <Input name="tipo" required placeholder="Certificado, declaração" />
            </Field>
            <Field label="Código">
              <Input name="codigo" />
            </Field>
            <Field label="Data de emissão">
              <Input name="data_emissao" type="date" />
            </Field>
            <Field label="Arquivo">
              <Input name="arquivo" type="file" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Informação complementar">
                <Input name="informacao" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <SubmitButton size="sm">Registrar documento</SubmitButton>
            </div>
          </ActionForm>
          {(documentos ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum documento registrado.</p>
          ) : (
            <div className="overflow-x-auto border-t">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Tipo</th>
                    <th className="px-4 py-2 font-medium">Código</th>
                    <th className="px-4 py-2 font-medium">Emissão</th>
                    <th className="px-4 py-2 font-medium">Arquivo</th>
                    <th className="px-4 py-2 font-medium">Observação</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(documentos ?? []).map((documento) => (
                    <tr key={documento.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{documento.tipo}</td>
                      <td className="px-4 py-3">{documento.codigo || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">{formatDate(documento.data_emissao)}</td>
                      <td className="px-4 py-3">
                        {documento.arquivo_path ? (
                          <a href={`/api/documento/${documento.id}`} className="text-primary underline-offset-4 hover:underline">
                            {documento.arquivo_nome || "Baixar"}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">{documento.informacao || "—"}</td>
                      <td className="py-3 pl-4 text-right">
                        <ActionForm action={excluirDocumento}>
                          <input type="hidden" name="id" value={documento.id} />
                          <input type="hidden" name="aluno_id" value={aluno.id} />
                          <input type="hidden" name="arquivo_path" value={documento.arquivo_path ?? ""} />
                          <SubmitButton variant="ghost" size="sm" className="text-destructive">
                            Excluir
                          </SubmitButton>
                        </ActionForm>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IconeWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}