import { notFound } from "next/navigation";
import {
  atualizarAluno,
  excluirDocumento,
  salvarDocumento,
} from "@/actions/alunos";
import { ActionForm } from "@/components/action-form";
import { CpfInput } from "@/components/cpf-input";
import { PageTitle } from "@/components/page-title";
import { LiberarAcesso } from "@/components/secretaria/liberar-acesso";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ESTADOS } from "@/lib/estados";
import { formatDate } from "@/lib/format";
import { lista, um } from "@/lib/relacao";
import { createClient } from "@/lib/supabase/server";
import { requireInterno } from "@/lib/session";

const ACESSO = {
  bloqueada: "Bloqueada",
  liberada: "Liberada",
  concluida: "Concluída",
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

  const [{ data: matriculas }, { data: documentos }, { data: cursos }] = await Promise.all([
    supabase
      .from("matricula")
      .select("id, status, curso:curso_id(nome), materias:matricula_materia(ordem, status, liberacao_manual, materia:materia_id(nome))")
      .eq("aluno_id", alunoId),
    supabase
      .from("documento_emitido")
      .select("id, tipo, informacao, codigo, data_emissao, arquivo_path, arquivo_nome")
      .eq("aluno_id", alunoId)
      .order("data_emissao", { ascending: false }),
    supabase
      .from("curso")
      .select("id, nome, materias:curso_materia(ordem, materia:materia_id(id, nome))")
      .eq("ativo", true)
      .order("nome"),
  ]);

  const cursosLiberacao = (cursos ?? []).map((curso) => ({
    id: curso.id,
    nome: curso.nome,
    materias: lista(
      curso.materias as {
        ordem: number;
        materia: { id: string; nome: string } | { id: string; nome: string }[] | null;
      }[]
    )
      .map((linha) => ({ ordem: linha.ordem, materia: um(linha.materia) }))
      .filter((linha) => linha.materia)
      .sort((a, b) => a.ordem - b.ordem)
      .map((linha) => ({ id: linha.materia!.id, nome: linha.materia!.nome })),
  }));

  return (
    <div className="space-y-10">
      <PageTitle title={aluno.nome} description={`Aluno ${aluno.numero_aluno} · ${aluno.email}`} />

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 font-semibold">Cadastro</h2>
        <ActionForm action={atualizarAluno} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={aluno.id} />
          <Field label="Nome completo">
            <Input name="nome" defaultValue={aluno.nome} required />
          </Field>
          <Field label="CPF">
            <CpfInput defaultValue={aluno.cpf} />
          </Field>
          <Field label="Data de nascimento">
            <Input name="data_nascimento" type="date" defaultValue={aluno.data_nascimento} required />
          </Field>
          <Field label="Telefone">
            <Input name="telefone" defaultValue={aluno.telefone} />
          </Field>
          <Field label="Número do aluno">
            <Input name="numero_aluno" defaultValue={aluno.numero_aluno} required />
          </Field>
          <Field label="Situação">
            <Select name="status" defaultValue={aluno.status}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </Select>
          </Field>
          <Field label="CEP">
            <Input name="cep" defaultValue={aluno.cep} />
          </Field>
          <Field label="Endereço">
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
              <option value="">Selecione</option>
              {ESTADOS.map((estado) => (
                <option key={estado.uf} value={estado.uf}>
                  {estado.nome} ({estado.uf})
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton>Salvar cadastro</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 font-semibold">Cursos e matérias</h2>
        <div className="space-y-4">
          {(matriculas ?? []).map((matricula) => {
            const curso = um(matricula.curso as { nome: string } | { nome: string }[] | null);
            const materias = lista(
              matricula.materias as {
                ordem: number;
                status: keyof typeof ACESSO;
                liberacao_manual: boolean;
                materia: { nome: string } | { nome: string }[] | null;
              }[]
            ).sort((a, b) => a.ordem - b.ordem);
            return (
              <div key={matricula.id}>
                <p className="font-medium">{curso?.nome ?? "Curso"}</p>
                <ul className="mt-1 text-sm text-muted-foreground">
                  {materias.map((linha) => (
                    <li key={`${matricula.id}-${linha.ordem}`}>
                      {um(linha.materia)?.nome ?? "Matéria"} — {ACESSO[linha.status]}
                      {linha.liberacao_manual ? " · liberação manual" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="mt-6">
          <LiberarAcesso alunoId={aluno.id} cursos={cursosLiberacao} />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 font-semibold">Documentos emitidos</h2>
        <ul className="mb-6 space-y-3">
          {(documentos ?? []).map((documento) => (
            <li key={documento.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
              <div>
                <p className="font-medium">{documento.tipo}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(documento.data_emissao)}
                  {documento.codigo ? ` · ${documento.codigo}` : ""}
                  {documento.informacao ? ` · ${documento.informacao}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {documento.arquivo_path ? (
                  <a href={`/api/documento/${documento.id}`} className="text-sm text-primary">
                    {documento.arquivo_nome || "Baixar arquivo"}
                  </a>
                ) : null}
                <ActionForm action={excluirDocumento}>
                  <input type="hidden" name="id" value={documento.id} />
                  <input type="hidden" name="aluno_id" value={aluno.id} />
                  <input type="hidden" name="arquivo_path" value={documento.arquivo_path ?? ""} />
                  <SubmitButton variant="ghost" pendingLabel="Excluindo...">
                    Excluir
                  </SubmitButton>
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
        <ActionForm action={salvarDocumento} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="aluno_id" value={aluno.id} />
          <Field label="Tipo de documento">
            <Input name="tipo" required placeholder="Certificado, declaração..." />
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
              <Textarea name="informacao" />
            </Field>
          </div>
          <SubmitButton>Registrar documento</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
