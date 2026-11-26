"use client";

import { useEffect, useState } from "react";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  adicionarArquivoAula,
  criarQuestionario,
  criarTopicoAula,
  excluirArquivoAula,
  excluirTopicoAula,
  reordenarFilhos,
  salvarTopicoAula,
} from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { CartaoQuestionario, type QuestaoAdmin } from "@/components/secretaria/cartao-questionario";
import { EditorApresentacao } from "@/components/secretaria/editor-apresentacao";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select } from "@/components/ui/field";

export type ArquivoAula = { id: string; nome: string; visualizar: boolean; baixar: boolean };

export type TopicoAdmin = {
  id: string;
  titulo: string;
  conteudo: string;
  video: string;
  liberaEm: string;
  epubNome: string | null;
  epubPath: string | null;
  posicao: number;
  arquivos: ArquivoAula[];
};

export type QuestionarioFilho = {
  id: string;
  titulo: string;
  encerra: boolean;
  posicao: number;
  questoes: QuestaoAdmin[];
};

type Filho =
  | ({ tipo: "topico" } & TopicoAdmin)
  | ({ tipo: "questionario" } & QuestionarioFilho);

export function FilhosAula({
  materiaId,
  aulaId,
  topicos,
  questionarios,
}: {
  materiaId: string;
  aulaId: string;
  topicos: TopicoAdmin[];
  questionarios: QuestionarioFilho[];
}) {
  const [lista, setLista] = useState<Filho[]>(() => juntar(topicos, questionarios));
  const [arrastando, setArrastando] = useState<string | null>(null);
  const assinatura = [...topicos.map((item) => item.id), ...questionarios.map((item) => item.id)].join(",");

  useEffect(() => {
    setLista(juntar(topicos, questionarios));
  }, [assinatura, topicos, questionarios]);

  async function soltar(destinoId: string) {
    const origemId = arrastando;
    setArrastando(null);
    if (!origemId || origemId === destinoId) return;
    const origem = lista.findIndex((item) => item.id === origemId);
    const destino = lista.findIndex((item) => item.id === destinoId);
    if (origem < 0 || destino < 0) return;
    const anterior = lista;
    const proxima = [...lista];
    const [item] = proxima.splice(origem, 1);
    proxima.splice(destino, 0, item);
    setLista(proxima);
    const resultado = await reordenarFilhos(
      materiaId,
      aulaId,
      proxima.map((linha) => ({ tipo: linha.tipo, id: linha.id }))
    );
    if ("error" in resultado) {
      setLista(anterior);
      toast.error(resultado.error);
    }
  }

  return (
    <div className="space-y-3 rounded-md border bg-secondary/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Tópicos e questionários desta lição</p>
        <div className="flex gap-2">
          <ActionForm action={criarTopicoAula}>
            <input type="hidden" name="materia_id" value={materiaId} />
            <input type="hidden" name="aula_id" value={aulaId} />
            <SubmitButton size="sm" variant="outline">Novo tópico</SubmitButton>
          </ActionForm>
          <ActionForm action={criarQuestionario}>
            <input type="hidden" name="materia_id" value={materiaId} />
            <input type="hidden" name="aula_id" value={aulaId} />
            <SubmitButton size="sm" variant="outline">Novo questionário</SubmitButton>
          </ActionForm>
        </div>
      </div>
      {lista.map((item) => (
        <div
          key={`${item.tipo}:${item.id}`}
          className={arrastando === item.id ? "opacity-60" : ""}
          onDragOver={(evento) => evento.preventDefault()}
          onDrop={() => void soltar(item.id)}
        >
          <details className="rounded-md border bg-card">
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
              <button
                type="button"
                draggable
                aria-label={`Arrastar ${item.titulo}`}
                className="cursor-grab text-muted-foreground"
                onClick={(evento) => evento.preventDefault()}
                onDragStart={(evento) => {
                  evento.stopPropagation();
                  evento.dataTransfer.effectAllowed = "move";
                  setArrastando(item.id);
                }}
                onDragEnd={() => setArrastando(null)}
              >
                <GripVertical className="size-4" />
              </button>
              <span className="min-w-0 flex-1 truncate">
                {item.tipo === "topico" ? "Tópico" : "Questionário"} · {item.titulo}
              </span>
            </summary>
            <div className="space-y-3 border-t px-3 py-3">
              {item.tipo === "topico" ? (
                <>
                  <ActionForm action={salvarTopicoAula} className="grid gap-3">
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="materia_id" value={materiaId} />
                    <Field label="Título">
                      <Input name="titulo" defaultValue={item.titulo} required />
                    </Field>
                    <EditorApresentacao name="conteudo" valorInicial={item.conteudo} compacto dica="Texto do tópico, exibido para o aluno." />
                    <Field label="Disponível em (data e hora de Brasília)">
                      <Input name="libera_em" type="datetime-local" defaultValue={item.liberaEm} />
                    </Field>
                    <Field label="Vídeo (ID do Bunny ou link do YouTube)">
                      <Input name="bunny_video_id" defaultValue={item.video} />
                    </Field>
                    <Field label={item.epubNome ? `Substituir livro (${item.epubNome})` : "Livro digital EPUB"}>
                      <Input name="epub" type="file" accept=".epub" />
                    </Field>
                    <SubmitButton size="sm">Salvar tópico</SubmitButton>
                  </ActionForm>
                  <ArquivosTopico materiaId={materiaId} aulaId={aulaId} topicoId={item.id} arquivos={item.arquivos} />
                  <ActionForm action={excluirTopicoAula}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="materia_id" value={materiaId} />
                    <input type="hidden" name="epub_path" value={item.epubPath ?? ""} />
                    <SubmitButton variant="ghost" size="sm">Excluir tópico</SubmitButton>
                  </ActionForm>
                </>
              ) : (
                <CartaoQuestionario
                  materiaId={materiaId}
                  id={item.id}
                  titulo={item.titulo}
                  encerra={item.encerra}
                  questoes={item.questoes}
                />
              )}
            </div>
          </details>
        </div>
      ))}
    </div>
  );
}

function ArquivosTopico({
  materiaId,
  aulaId,
  topicoId,
  arquivos,
}: {
  materiaId: string;
  aulaId: string;
  topicoId: string;
  arquivos: ArquivoAula[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Arquivos</p>
      {arquivos.map((arquivo) => (
        <div key={arquivo.id} className="flex items-center justify-between gap-3 text-sm">
          <span className="min-w-0 truncate">{arquivo.nome}</span>
          <ActionForm action={excluirArquivoAula}>
            <input type="hidden" name="id" value={arquivo.id} />
            <input type="hidden" name="aula_id" value={aulaId} />
            <input type="hidden" name="materia_id" value={materiaId} />
            <SubmitButton variant="ghost" size="sm">Remover</SubmitButton>
          </ActionForm>
        </div>
      ))}
      <ActionForm action={adicionarArquivoAula} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_11rem_auto]">
        <input type="hidden" name="aula_id" value={aulaId} />
        <input type="hidden" name="topico_id" value={topicoId} />
        <input type="hidden" name="materia_id" value={materiaId} />
        <Field label="Nome">
          <Input name="nome" placeholder="Material do tópico" required />
        </Field>
        <Field label="Arquivo">
          <Input name="arquivo" type="file" required />
        </Field>
        <Field label="Como usar">
          <Select name="modo" defaultValue="ambos">
            <option value="visualizar">Visualizar</option>
            <option value="baixar">Baixar</option>
            <option value="ambos">Visualizar e baixar</option>
          </Select>
        </Field>
        <SubmitButton size="sm">Adicionar</SubmitButton>
      </ActionForm>
    </div>
  );
}

function juntar(topicos: TopicoAdmin[], questionarios: QuestionarioFilho[]): Filho[] {
  return [
    ...topicos.map((item) => ({ tipo: "topico" as const, ...item })),
    ...questionarios.map((item) => ({ tipo: "questionario" as const, ...item })),
  ].sort((a, b) => a.posicao - b.posicao);
}
