"use client";

import { useMemo, useState } from "react";
import { concluirMatricula, desmatricularMatricula, matricularCurso, reiniciarMatricula } from "@/actions/alunos";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type LinhaCursoAluno = {
  id: string;
  nome: string;
  status: "ativa" | "concluida" | "cancelada";
  feitas: number;
  total: number;
  dataMatricula: string;
  dataPublicacao: string;
  prova: string;
};

type Ordenacao = "recente" | "antiga" | "nome";

export function CursosAluno({
  alunoId,
  cursos,
  produtosDisponiveis,
}: {
  alunoId: string;
  cursos: LinhaCursoAluno[];
  produtosDisponiveis: { id: string; nome: string }[];
}) {
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("recente");
  const [modalAberto, setModalAberto] = useState(false);

  const lista = useMemo(() => {
    const copia = cursos.filter((item) => item.status !== "cancelada");
    copia.sort((a, b) => {
      if (ordenacao === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
      const diff = new Date(a.dataPublicacao).getTime() - new Date(b.dataPublicacao).getTime();
      return ordenacao === "antiga" ? diff : -diff;
    });
    return copia;
  }, [cursos, ordenacao]);

  return (
  <>
      <Card>
        <CardHeader className="space-y-4 pb-4">
          <CardTitle>Cursos</CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-primary text-primary hover:bg-primary/5"
              onClick={() => setModalAberto(true)}
            >
              + Adicionar cursos
            </Button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="shrink-0">Ordenar por:</span>
              <Select
                value={ordenacao}
                onChange={(evento) => setOrdenacao(evento.target.value as Ordenacao)}
                className="h-8 min-w-[14rem]"
              >
                <option value="recente">Publicação (mais nova primeiro)</option>
                <option value="antiga">Publicação (mais antiga primeiro)</option>
                <option value="nome">Nome (A–Z)</option>
              </Select>
            </label>
          </div>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          {lista.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum curso matriculado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Curso</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Progresso</th>
                    <th className="px-4 py-2 font-medium">Matrícula</th>
                    <th className="px-4 py-2 font-medium">Prova</th>
                    <th className="px-4 py-2 font-medium">Expiração</th>
                    <th className="px-4 py-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((linha) => {
                    const concluido = linha.total > 0 && linha.feitas >= linha.total;
                    const encerrado = linha.status === "concluida";
                    return (
                      <tr key={linha.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{linha.nome}</td>
                        <td className="px-4 py-3">
                          {encerrado ? (
                            <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white bg-[#5c3d99]">
                              Encerrado
                            </span>
                          ) : (
                            <span className="inline-flex rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#1e6eb8] bg-[#dbeafe]">
                              Matriculado
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          <span className={cn(concluido || encerrado ? "font-semibold text-emerald-600" : "text-muted-foreground")}>
                            {linha.feitas} / {linha.total}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap tabular-nums text-muted-foreground">
                          {formatDateTime(linha.dataMatricula)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{linha.prova}</td>
                        <td className="px-4 py-3 text-muted-foreground">—</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {encerrado ? (
                              <ActionForm action={reiniciarMatricula}>
                                <input type="hidden" name="aluno_id" value={alunoId} />
                                <input type="hidden" name="matricula_id" value={linha.id} />
                                <SubmitButton
                                  variant="outline"
                                  size="sm"
                                  className="border-amber-500 text-amber-700 hover:bg-amber-50"
                                  pendingLabel="..."
                                >
                                  Reiniciar
                                </SubmitButton>
                              </ActionForm>
                            ) : (
                              <>
                                <ActionForm action={concluirMatricula}>
                                  <input type="hidden" name="aluno_id" value={alunoId} />
                                  <input type="hidden" name="matricula_id" value={linha.id} />
                                  <SubmitButton variant="outline" size="sm" pendingLabel="...">
                                    Concluir
                                  </SubmitButton>
                                </ActionForm>
                                <ActionForm action={desmatricularMatricula}>
                                  <input type="hidden" name="aluno_id" value={alunoId} />
                                  <input type="hidden" name="matricula_id" value={linha.id} />
                                  <SubmitButton variant="destructive" size="sm" pendingLabel="...">
                                    Desmatricular
                                  </SubmitButton>
                                </ActionForm>
                              </>
                            )}
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

      {modalAberto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="adicionar-curso-titulo" className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <h2 id="adicionar-curso-titulo" className="text-lg font-semibold">
              Adicionar curso
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Escolha o produto para matricular o aluno.</p>
            <ActionForm action={matricularCurso} className="mt-4 flex flex-col gap-4">
              <input type="hidden" name="aluno_id" value={alunoId} />
              <Field label="Curso">
                <Select name="produto_id" defaultValue="" required>
                  <option value="" disabled>
                    {produtosDisponiveis.length === 0 ? "Nenhum curso disponível" : "Selecione o curso"}
                  </option>
                  {produtosDisponiveis.map((produto) => (
                    <option key={produto.id} value={produto.id}>
                      {produto.nome}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalAberto(false)}>
                  Cancelar
                </Button>
                <SubmitButton size="sm" pendingLabel="Matriculando..." disabled={produtosDisponiveis.length === 0}>
                  Matricular
                </SubmitButton>
              </div>
            </ActionForm>
          </div>
        </div>
      ) : null}
    </>
  );
}