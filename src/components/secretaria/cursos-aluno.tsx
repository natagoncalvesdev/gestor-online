"use client";

import { useMemo, useState } from "react";
import { Pencil, X } from "lucide-react";
import {
  alterarDataMatricula,
  concluirMateriaMatricula,
  desmatricularMateriaMatricula,
  liberarMateria,
  liberarNovaTentativaProva,
  matricularMateria,
  matricularSequencia,
  reiniciarMateriaMatricula,
  reiniciarMatricula,
  removerSequencia,
} from "@/actions/alunos";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { NotaComTentativas, type TentativaProvaInfo } from "@/components/estudo/nota-tentativas";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SequenciaMatriculada = {
  matriculaId: string;
  produtoId: string;
  nome: string;
  feitas: number;
  total: number;
  percentual: number;
};

export type LinhaCursoAluno = {
  id: string;
  matriculaId: string;
  produtoId: string;
  produtoNome: string;
  materiaId: string;
  nome: string;
  statusMateria: "bloqueada" | "liberada" | "concluida" | "desmatriculada";
  statusMatricula: "ativa" | "concluida" | "cancelada";
  feitas: number;
  total: number;
  dataMatricula: string | null;
  dataPublicacao: string;
  prova: string;
  resultadoProva: "aprovado" | "reprovado" | null;
  expiracao: string | null;
  mostrarAcoesProduto: boolean;
  gratuita: boolean;
  ordemMateria: number;
  emAndamento: boolean;
  tentativasProva: TentativaProvaInfo[];
  provaNovaTentativa: boolean;
};

const ROTULO_MATERIA = {
  bloqueada: { texto: "Aguardando", classe: "bg-secondary text-muted-foreground" },
  liberada: { texto: "Matriculado", classe: "bg-[#dbeafe] text-[#1e6eb8]" },
  andamento: { texto: "Andamento", classe: "bg-amber-100 text-amber-900" },
  concluida: { texto: "Concluída", classe: "bg-emerald-100 text-emerald-800" },
  desmatriculada: { texto: "Encerrado", classe: "bg-rose-100 text-rose-800" },
  aprovado: { texto: "Aprovado", classe: "bg-emerald-100 text-emerald-800" },
  reprovado: { texto: "Reprovado", classe: "bg-amber-100 text-amber-900" },
} as const;

function rotuloStatus(linha: LinhaCursoAluno): { texto: string; classe: string } {
  if (linha.statusMateria === "desmatriculada") return ROTULO_MATERIA.desmatriculada;
  if (linha.statusMateria === "bloqueada") return ROTULO_MATERIA.bloqueada;
  if (linha.statusMateria === "concluida") return ROTULO_MATERIA.concluida;
  if (linha.emAndamento && linha.statusMateria === "liberada") return ROTULO_MATERIA.andamento;
  if (linha.resultadoProva === "aprovado") return ROTULO_MATERIA.aprovado;
  if (linha.resultadoProva === "reprovado") return ROTULO_MATERIA.reprovado;
  if (linha.statusMateria === "liberada") return ROTULO_MATERIA.liberada;
  return ROTULO_MATERIA.bloqueada;
}

function paraEntradaDataHora(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  const pad = (valor: number) => String(valor).padStart(2, "0");
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

export function CursosAluno({
  alunoId,
  cursos,
  materiasDisponiveis,
  sequenciasDisponiveis,
  sequenciaAtiva,
  sequenciasMatriculadas,
  podeEditarMatricula,
}: {
  alunoId: string;
  cursos: LinhaCursoAluno[];
  materiasDisponiveis: {
    materiaId: string;
    materiaNome: string;
    produtoId: string;
    produtoNome: string;
  }[];
  sequenciasDisponiveis: { id: string; nome: string }[];
  sequenciaAtiva: { matriculaId: string; nome: string } | null;
  sequenciasMatriculadas: SequenciaMatriculada[];
  podeEditarMatricula: boolean;
}) {
  const [modalAberto, setModalAberto] = useState(false);
  const [modalSequencia, setModalSequencia] = useState(false);
  const [modalMatricula, setModalMatricula] = useState<{ id: string; dataMatricula: string; produtoNome: string } | null>(null);

  const lista = useMemo(() => {
    const copia = [...cursos];
    copia.sort((a, b) => {
      if (a.gratuita !== b.gratuita) return a.gratuita ? -1 : 1;
      const ordem = b.ordemMateria - a.ordemMateria;
      if (ordem !== 0) return ordem;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
    return copia;
  }, [cursos]);

  return (
    <>
      <Card>
        <CardHeader className="space-y-4 pb-4">
          <CardTitle>Matérias</CardTitle>
          <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-primary text-primary hover:bg-primary/5"
                onClick={() => setModalAberto(true)}
              >
                + Adicionar matérias
              </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          {lista.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nenhuma matéria matriculada.</p>
          ) : (
            <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full min-w-[1040px] text-sm leading-snug">
                <colgroup>
                  <col className="min-w-[13rem] w-[22%]" />
                  <col className="w-[14%]" />
                  <col className="w-[9%]" />
                  <col className="w-[7%]" />
                  <col className="w-[15%]" />
                  <col className="w-[12%]" />
                  <col className="w-[8%]" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                    <th className="px-3 py-1.5 font-medium">Matéria</th>
                    <th className="px-2 py-1.5 font-medium">Produto</th>
                    <th className="px-2 py-1.5 font-medium">Status</th>
                    <th className="px-2 py-1.5 font-medium">Progresso</th>
                    <th className="px-2 py-1.5 font-medium">Matrícula</th>
                    <th className="px-2 py-1.5 font-medium">Prova</th>
                    <th className="px-2 py-1.5 font-medium">Validade</th>
                    <th className="px-2 py-1.5 pr-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((linha) => {
                    const concluido = linha.total > 0 && linha.feitas >= linha.total;
                    const matriculaAtiva = linha.statusMatricula === "ativa";
                    const materiaAtiva =
                      linha.statusMateria === "bloqueada" ||
                      linha.statusMateria === "liberada";
                    const rotulo = rotuloStatus(linha);
                    return (
                      <tr key={linha.id} className="border-b last:border-0">
                        <td className="max-w-[16rem] px-3 py-1.5 font-medium">
                          <span className="line-clamp-2" title={linha.nome}>
                            {linha.nome}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">
                          <span className="line-clamp-2" title={linha.produtoNome}>
                            {linha.produtoNome}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">
                          <span
                            className={cn(
                              "inline-flex rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                              rotulo.classe,
                            )}
                          >
                            {rotulo.texto}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          <span
                            className={cn(
                              concluido || linha.statusMateria === "concluida"
                                ? "font-semibold text-emerald-600"
                                : "text-muted-foreground",
                            )}
                          >
                            {linha.feitas} / {linha.total}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap tabular-nums text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>{linha.dataMatricula ? formatDateTime(linha.dataMatricula) : null}</span>
                            {podeEditarMatricula && linha.dataMatricula ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setModalMatricula({
                                    id: linha.matriculaId,
                                    dataMatricula: linha.dataMatricula,
                                    produtoNome: linha.produtoNome,
                                  })
                                }
                                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-primary"
                                aria-label="Alterar data da matrícula"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">
                          <div className="flex flex-nowrap items-center gap-2">
                            <NotaComTentativas nota={linha.prova} tentativas={linha.tentativasProva} />
                            {linha.tentativasProva.length > 0 && matriculaAtiva ? (
                              linha.provaNovaTentativa ? (
                                <span className="text-[11px] font-medium text-amber-800">Nova tentativa liberada</span>
                              ) : (
                                <ActionForm action={liberarNovaTentativaProva} className="contents">
                                  <input type="hidden" name="aluno_id" value={alunoId} />
                                  <input type="hidden" name="matricula_materia_id" value={linha.id} />
                                  <SubmitButton
                                    variant="outline"
                                    size="sm"
                                    className="h-7 shrink-0 whitespace-nowrap px-2 text-[11px]"
                                    pendingLabel="..."
                                  >
                                    Nova tentativa
                                  </SubmitButton>
                                </ActionForm>
                              )
                            ) : null}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">{formatDate(linha.expiracao)}</td>
                        <td className="px-2 py-1.5 pr-3 align-middle">
                          <div className="flex flex-nowrap items-center gap-1.5">
                            <div className="flex h-8 w-[5.75rem] shrink-0 items-center">
                            {linha.statusMateria === "bloqueada" && matriculaAtiva ? (
                              <ActionForm action={liberarMateria} className="w-full">
                                <input type="hidden" name="aluno_id" value={alunoId} />
                                <input type="hidden" name="produto_id" value={linha.produtoId} />
                                <input type="hidden" name="materia_id" value={linha.materiaId} />
                                <SubmitButton
                                  variant="outline"
                                  size="sm"
                                  className="w-full shrink-0 whitespace-nowrap"
                                  pendingLabel="..."
                                >
                                  Liberar
                                </SubmitButton>
                              </ActionForm>
                            ) : null}
                            {linha.statusMateria === "liberada" && matriculaAtiva ? (
                              <ActionForm action={concluirMateriaMatricula} className="w-full">
                                <input type="hidden" name="aluno_id" value={alunoId} />
                                <input type="hidden" name="matricula_materia_id" value={linha.id} />
                                <SubmitButton
                                  variant="outline"
                                  size="sm"
                                  className="w-full shrink-0 whitespace-nowrap"
                                  pendingLabel="..."
                                >
                                  Concluir
                                </SubmitButton>
                              </ActionForm>
                            ) : null}
                            </div>
                            {matriculaAtiva && materiaAtiva ? (
                              <ActionForm action={desmatricularMateriaMatricula} className="contents">
                                <input type="hidden" name="aluno_id" value={alunoId} />
                                <input type="hidden" name="matricula_materia_id" value={linha.id} />
                                <SubmitButton
                                  variant="destructive"
                                  size="sm"
                                  className="shrink-0 whitespace-nowrap"
                                  pendingLabel="..."
                                >
                                  Desmatricular
                                </SubmitButton>
                              </ActionForm>
                            ) : null}
                            {linha.statusMateria === "desmatriculada" || linha.statusMateria === "concluida" ? (
                              <ActionForm action={reiniciarMateriaMatricula} className="contents">
                                <input type="hidden" name="aluno_id" value={alunoId} />
                                <input type="hidden" name="matricula_materia_id" value={linha.id} />
                                <SubmitButton
                                  variant="outline"
                                  size="sm"
                                  className="shrink-0 whitespace-nowrap border-amber-500 text-amber-700 hover:bg-amber-50"
                                  pendingLabel="..."
                                >
                                  Reiniciar
                                </SubmitButton>
                              </ActionForm>
                            ) : null}
                            {linha.statusMatricula === "concluida" && linha.mostrarAcoesProduto ? (
                              <ActionForm action={reiniciarMatricula} className="contents">
                                <input type="hidden" name="aluno_id" value={alunoId} />
                                <input type="hidden" name="matricula_id" value={linha.matriculaId} />
                                <SubmitButton
                                  variant="outline"
                                  size="sm"
                                  className="shrink-0 whitespace-nowrap border-amber-500 text-amber-700 hover:bg-amber-50"
                                  pendingLabel="..."
                                >
                                  Reiniciar produto
                                </SubmitButton>
                              </ActionForm>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sequência</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit border-primary text-primary hover:bg-primary/5"
              disabled={Boolean(sequenciaAtiva) || sequenciasDisponiveis.length === 0}
              onClick={() => setModalSequencia(true)}
            >
              + Adicionar sequência
            </Button>
            {sequenciaAtiva ? (
              <p className="text-sm text-muted-foreground">
                Sequência ativa: <span className="font-medium text-foreground">{sequenciaAtiva.nome}</span>. Conclua ou remova
                para adicionar outra.
              </p>
            ) : sequenciasDisponiveis.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma outra sequência disponível para matricular.</p>
            ) : null}
          </div>
          {sequenciasMatriculadas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma sequência matriculada.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {sequenciasMatriculadas.map((sequencia) => (
                <li
                  key={sequencia.matriculaId}
                  className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{sequencia.nome}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${sequencia.percentual}%` }} />
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{sequencia.percentual}%</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sequencia.percentual}% concluído · {sequencia.feitas} de {sequencia.total} matérias
                    </p>
                  </div>
                  <ActionForm action={removerSequencia} className="contents">
                    <input type="hidden" name="aluno_id" value={alunoId} />
                    <input type="hidden" name="matricula_id" value={sequencia.matriculaId} />
                    <SubmitButton variant="destructive" size="sm" className="shrink-0 whitespace-nowrap" pendingLabel="...">
                      Remover sequência
                    </SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {modalAberto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="adicionar-curso-titulo" className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <h2 id="adicionar-curso-titulo" className="text-lg font-semibold">
              Adicionar matérias
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha a matéria. O aluno será matriculado apenas nela (produto de catálogo não agrupador).
            </p>
            <ActionForm action={matricularMateria} className="mt-4 flex flex-col gap-4">
              <input type="hidden" name="aluno_id" value={alunoId} />
              <Field label="Matéria">
                <Select name="materia_opcao" defaultValue="" required>
                  <option value="" disabled>
                    {materiasDisponiveis.length === 0 ? "Nenhuma matéria disponível" : "Selecione a matéria"}
                  </option>
                  {materiasDisponiveis.map((item) => (
                    <option key={`${item.produtoId}-${item.materiaId}`} value={`${item.produtoId}|${item.materiaId}`}>
                      {item.materiaNome}
                      {item.produtoNome ? ` (${item.produtoNome})` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalAberto(false)}>
                  Cancelar
                </Button>
                <SubmitButton size="sm" pendingLabel="Matriculando..." disabled={materiasDisponiveis.length === 0}>
                  Matricular
                </SubmitButton>
              </div>
            </ActionForm>
          </div>
        </div>
      ) : null}

      {modalSequencia ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="adicionar-sequencia-titulo" className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <h2 id="adicionar-sequencia-titulo" className="text-lg font-semibold">
              Adicionar sequência
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha o produto agrupador (sequência). Todas as matérias cadastradas nele serão matriculadas.
            </p>
            <ActionForm action={matricularSequencia} className="mt-4 flex flex-col gap-4" onSuccess={() => setModalSequencia(false)}>
              <input type="hidden" name="aluno_id" value={alunoId} />
              <Field label="Sequência">
                <Select name="produto_id" defaultValue="" required>
                  <option value="" disabled>
                    {sequenciasDisponiveis.length === 0 ? "Nenhuma sequência disponível" : "Selecione a sequência"}
                  </option>
                  {sequenciasDisponiveis.map((produto) => (
                    <option key={produto.id} value={produto.id}>
                      {produto.nome}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalSequencia(false)}>
                  Cancelar
                </Button>
                <SubmitButton size="sm" pendingLabel="Adicionando..." disabled={sequenciasDisponiveis.length === 0}>
                  Adicionar
                </SubmitButton>
              </div>
            </ActionForm>
          </div>
        </div>
      ) : null}

      {modalMatricula ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="alterar-matricula-titulo"
            className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-lg"
          >
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 id="alterar-matricula-titulo" className="text-lg font-semibold">
                Alterar data da matrícula
              </h2>
              <button
                type="button"
                onClick={() => setModalMatricula(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </div>
            <ActionForm
              key={modalMatricula.id}
              action={alterarDataMatricula}
              className="flex flex-col"
              onSuccess={() => setModalMatricula(null)}
            >
              <div className="space-y-4 px-5 py-4">
                <p className="text-sm text-muted-foreground">
                  Produto: {modalMatricula.produtoNome}. Defina a nova data e hora de matrícula.
                </p>
                <input type="hidden" name="aluno_id" value={alunoId} />
                <input type="hidden" name="matricula_id" value={modalMatricula.id} />
                <Field label="Data e hora">
                  <Input
                    name="data_matricula"
                    type="datetime-local"
                    defaultValue={paraEntradaDataHora(modalMatricula.dataMatricula)}
                    required
                  />
                </Field>
              </div>
              <div className="flex justify-end gap-2 border-t bg-muted/30 px-5 py-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalMatricula(null)}>
                  Cancelar
                </Button>
                <SubmitButton size="sm" pendingLabel="Salvando...">
                  Salvar
                </SubmitButton>
              </div>
            </ActionForm>
          </div>
        </div>
      ) : null}
    </>
  );
}