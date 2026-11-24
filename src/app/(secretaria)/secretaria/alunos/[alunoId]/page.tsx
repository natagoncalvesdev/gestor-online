import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Lock } from "lucide-react";
import {
  atualizarAluno,
  destacarObservacao,
  excluirDocumento,
  liberarMateria,
  matricularCurso,
  salvarDocumento,
  salvarObservacao,
} from "@/actions/alunos";
import { ActionForm } from "@/components/action-form";
import { CpfInput } from "@/components/cpf-input";
import { AlunoAbas } from "@/components/secretaria/aluno-abas";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ESTADOS } from "@/lib/estados";
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

const ROTULO_MATERIA = {
  cursando: "Cursando",
  encerrado: "Encerrado",
  aguardando: "Aguardando",
} as const;

export default async function AlunoDetalhePage({
  params,
}: {
  params: Promise<{ alunoId: string }>;
}) {
  await requireInterno();
  const { alunoId } = await params;
  const supabase = await createClient();
  const { data: aluno } = await supabase.from("aluno").select("*").eq("id", alunoId).maybeSingle();
  if (!aluno) notFound();

  const [{ data: matriculas }, { data: documentos }, { data: cursos }, { data: observacoes }, { data: pedidos }, { data: aulas }, { data: progresso }] =
    await Promise.all([
      supabase
        .from("matricula")
        .select("id, status, data_criacao, produto_id, produto:produto_id(nome), materias:matricula_materia(ordem, status, liberada_em, materia_id, materia:materia_id(nome))")
        .eq("aluno_id", alunoId),
      supabase
        .from("documento_emitido")
        .select("id, tipo, informacao, codigo, data_emissao, arquivo_path, arquivo_nome")
        .eq("aluno_id", alunoId)
        .order("data_emissao", { ascending: false }),
        supabase.from("produto").select("id, nome").eq("ativo", true).order("nome"),
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
      supabase.from("aula_progresso").select("aula_id, video_concluido").eq("aluno_id", alunoId),
    ]);

  const aulasPorMateria = new Map<string, string[]>();
  for (const aula of aulas ?? []) {
    const listaAulas = aulasPorMateria.get(aula.materia_id) ?? [];
    listaAulas.push(aula.id);
    aulasPorMateria.set(aula.materia_id, listaAulas);
  }
  const vistas = new Set((progresso ?? []).filter((item) => item.video_concluido).map((item) => item.aula_id));
  const telefone = String(aluno.telefone ?? "");
  const digitos = telefone.replace(/\D/g, "");
  const whatsapp = digitos ? `https://wa.me/55${digitos}` : null;
  const produtosJaMatriculados = new Set((matriculas ?? []).map((item) => item.produto_id as string));

  const gruposCurso = (matriculas ?? []).map((matricula) => {
    const produto = um(matricula.produto as { nome: string } | { nome: string }[] | null);
    const materias = lista(
      matricula.materias as {
        ordem: number;
        status: "bloqueada" | "liberada" | "concluida";
        liberada_em: string | null;
        materia_id: string;
        materia: { nome: string } | { nome: string }[] | null;
      }[]
    ).sort((a, b) => a.ordem - b.ordem);
    const linhas = materias.map((linha) => {
      const ids = aulasPorMateria.get(linha.materia_id) ?? [];
      const feitas = ids.filter((id) => vistas.has(id)).length;
      const situacao = linha.status === "concluida" ? "encerrado" : linha.status === "liberada" ? "cursando" : "aguardando";
      return {
        key: `${matricula.id}-${linha.materia_id}`,
        nome: um(linha.materia)?.nome ?? "Matéria",
        situacao: situacao as keyof typeof ROTULO_MATERIA,
        feitas,
        total: ids.length,
        matriculaEm: linha.liberada_em ?? matricula.data_criacao,
        produtoId: matricula.produto_id as string,
        materiaId: linha.materia_id,
        bloqueada: linha.status === "bloqueada",
      };
    });
    const feitas = linhas.reduce((soma, linha) => soma + linha.feitas, 0);
    const total = linhas.reduce((soma, linha) => soma + linha.total, 0);
    return {
      id: matricula.id as string,
      nome: produto?.nome ?? "Produto",
      feitas,
      total,
      linhas,
    };
  });

  const abaAluno = (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Informações do aluno</CardTitle>
          <CardDescription>Dados cadastrais usados pela secretaria e pela área do aluno.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={atualizarAluno} className="flex flex-col gap-6">
            <input type="hidden" name="id" value={aluno.id} />
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
                <Input name="telefone" defaultValue={telefone} />
                {whatsapp ? (
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-primary underline-offset-4 hover:underline">
                    Abrir WhatsApp
                  </a>
                ) : null}
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
            <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="text-sm font-medium">Endereço</p>
              </div>
              <Field label="CEP">
                <Input name="cep" defaultValue={aluno.cep} />
              </Field>
              <Field label="Logradouro">
                <Input name="logradouro" defaultValue={aluno.logradouro} />
              </Field>
              <Field label="Número">
                <Input name="numero" defaultValue={aluno.numero} />
              </Field>
              <Field label="Complemento">
                <Input name="complemento" defaultValue={aluno.complemento} />
              </Field>
              <Field label="Bairro">
                <Input name="bairro" defaultValue={aluno.bairro} />
              </Field>
              <Field label="Cidade">
                <Input name="cidade" defaultValue={aluno.cidade} />
              </Field>
              <Field label="Estado">
                <Select name="uf" defaultValue={aluno.uf}>
                  <option value="">Selecione o estado</option>
                  {ESTADOS.map((estado) => (
                    <option key={estado.uf} value={estado.uf}>
                      {estado.nome}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="flex justify-end">
              <SubmitButton size="sm">Salvar</SubmitButton>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
          <CardDescription>Anotações internas da secretaria. O aluno não vê este histórico.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ActionForm action={salvarObservacao} className="flex flex-col gap-2">
            <input type="hidden" name="aluno_id" value={aluno.id} />
            <Textarea name="texto" placeholder="Escreva uma observação…" rows={3} className="min-h-[4.5rem]" aria-label="Nova observação" />
            <div className="flex justify-end">
              <SubmitButton size="sm">Adicionar</SubmitButton>
            </div>
          </ActionForm>
          {(observacoes ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma observação ainda. Adicione a primeira acima.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {(observacoes ?? []).map((nota) => (
                <div key={nota.id} className="rounded-lg border bg-muted/30 px-3 py-3">
                  <p className="whitespace-pre-wrap">{nota.texto}</p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(nota.data_criacao)}
                      {" · "}
                      {nota.autor_nome}
                      {nota.destaque ? " · Fixada" : ""}
                    </p>
                    <ActionForm action={destacarObservacao}>
                      <input type="hidden" name="id" value={nota.id} />
                      <input type="hidden" name="aluno_id" value={aluno.id} />
                      <input type="hidden" name="destaque" value={nota.destaque ? "1" : "0"} />
                      <SubmitButton variant="outline" size="sm">
                        {nota.destaque ? "Desafixar" : "Fixar"}
                      </SubmitButton>
                    </ActionForm>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  const abaCursos =
    gruposCurso.length === 0 ? (
      <div className="flex flex-col gap-6">
        <Matricular alunoId={aluno.id} produtos={(cursos ?? []).filter((produto) => !produtosJaMatriculados.has(produto.id))} />
        <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">Este aluno ainda não está matriculado em nenhum produto.</p>
      </div>
    ) : (
      <div className="flex flex-col gap-6">
        <Matricular alunoId={aluno.id} produtos={(cursos ?? []).filter((produto) => !produtosJaMatriculados.has(produto.id))} />
        {gruposCurso.map((grupo) => {
          const percentual = grupo.total > 0 ? Math.round((grupo.feitas / grupo.total) * 100) : 0;
          return (
            <Card key={grupo.id}>
              <CardHeader>
                <CardTitle>{grupo.nome}</CardTitle>
                <CardDescription>
                  {grupo.feitas} de {grupo.total} aulas concluídas
                </CardDescription>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percentual} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${percentual}%` }} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-0 divide-y border-t px-0 pt-0">
                {grupo.linhas.map((linha) => (
                  <div key={linha.key} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="mt-0.5 shrink-0">
                        {linha.situacao === "aguardando" ? (
                          <Lock className="size-5 text-muted-foreground/40" aria-hidden />
                        ) : linha.situacao === "cursando" ? (
                          <Clock className="size-5 text-amber-600" aria-hidden />
                        ) : (
                          <CheckCircle2 className="size-5 text-emerald-600" aria-hidden />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium leading-tight">{linha.nome}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {ROTULO_MATERIA[linha.situacao]}
                          {" · "}
                          <span className="tabular-nums text-foreground">
                            {linha.feitas}/{linha.total}
                          </span>{" "}
                          aulas
                          {linha.bloqueada ? null : (
                            <>
                              {" · "}
                              matrícula em {formatDateTime(linha.matriculaEm)}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    {linha.bloqueada ? (
                      <ActionForm action={liberarMateria}>
                        <input type="hidden" name="aluno_id" value={aluno.id} />
                        <input type="hidden" name="produto_id" value={linha.produtoId} />
                        <input type="hidden" name="materia_id" value={linha.materiaId} />
                        <SubmitButton variant="outline" size="sm">
                          Liberar matéria
                        </SubmitButton>
                      </ActionForm>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );

  const abaCompras = (
    <Card>
      <CardHeader>
        <CardTitle>Compras</CardTitle>
        <CardDescription>Pedidos registrados para este aluno.</CardDescription>
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
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums">{formatDateTime(pedido.data_criacao)}</td>
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
  );

  const abaDocumentos = (
    <Card>
      <CardHeader>
        <CardTitle>Documentos emitidos</CardTitle>
        <CardDescription>Certificados, declarações e outros arquivos entregues ao aluno.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
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
          <div className="flex justify-end sm:col-span-2">
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
  );

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/secretaria/alunos" className="mb-1 -ml-2 inline-flex h-8 w-fit items-center rounded-md px-2 text-sm font-medium hover:bg-secondary">
          ← Voltar para alunos
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{aluno.nome}</h1>
        <p className="text-sm text-muted-foreground">
          Aluno nº {aluno.numero_aluno} · {aluno.status === "ativo" ? "Ativo" : "Inativo"} · cadastrado em {formatDate(aluno.data_cadastro)}
        </p>
      </div>
      <AlunoAbas
        abas={[
          { id: "aluno", rotulo: "Aluno", conteudo: abaAluno },
          { id: "estudos", rotulo: "Estudos", conteudo: abaCursos },
          { id: "compras", rotulo: "Compras", conteudo: abaCompras },
          { id: "documentos", rotulo: "Documentos", conteudo: abaDocumentos },
        ]}
      />
    </div>
  );
}

function Matricular({
  alunoId,
  produtos,
}: {
  alunoId: string;
  produtos: { id: string; nome: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Matricular em um produto</CardTitle>
        <CardDescription>Abre as primeiras matérias do produto, conforme o limite definido nele.</CardDescription>
      </CardHeader>
      <CardContent>
        <ActionForm action={matricularCurso} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="aluno_id" value={alunoId} />
          <div className="min-w-0 flex-1">
            <Field label="Produto">
              <Select name="produto_id" defaultValue="">
                <option value="">{produtos.length === 0 ? "Nenhum produto disponível" : "Selecione o produto"}</option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <SubmitButton size="sm">Matricular</SubmitButton>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
