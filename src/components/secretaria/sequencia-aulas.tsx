"use client";

import { useEffect, useState } from "react";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { adicionarArquivoAula, clonarAula, excluirArquivoAula, excluirAula, excluirTopico, reordenarConteudo, salvarAula } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select } from "@/components/ui/field";

export type ArquivoAula = { id: string; nome: string; visualizar: boolean; baixar: boolean };

export type ItemSequencia =
  | { tipo: "topico"; id: string; titulo: string }
  | {
      tipo: "aula";
      id: string;
      titulo: string;
      ordem: number;
      video: string;
      liberaEm: string;
      epubNome: string | null;
      epubPath: string | null;
      arquivos: ArquivoAula[];
    };

export function SequenciaAulas({ materiaId, itens }: { materiaId: string; itens: ItemSequencia[] }) {
  const [lista, setLista] = useState(itens);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const assinatura = itens.map((item) => `${item.tipo}:${item.id}`).join(",");

  useEffect(() => {
    setLista(itens);
  }, [assinatura, itens]);

  async function soltar(destinoId: string) {
    const origemId = arrastando;
    setArrastando(null);
    if (!origemId || origemId === destinoId) return;
    const origem = lista.findIndex((item) => item.id === origemId);
    const destino = lista.findIndex((item) => item.id === destinoId);
    if (origem < 0 || destino < 0) return;
    const proxima = [...lista];
    const [item] = proxima.splice(origem, 1);
    proxima.splice(destino, 0, item);
    setLista(proxima);
    const resultado = await reordenarConteudo(
      materiaId,
      proxima.map((linha) => ({ tipo: linha.tipo, id: linha.id }))
    );
    if ("error" in resultado) toast.error(resultado.error);
  }

  return (
    <div className="space-y-3">
      {lista.map((item) => (
        <div
          key={`${item.tipo}:${item.id}`}
          className={arrastando === item.id ? "opacity-60" : ""}
          onDragOver={(evento) => evento.preventDefault()}
          onDrop={() => void soltar(item.id)}
        >
          {item.tipo === "topico" ? (
            <div className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2">
              <Alca arrastar={() => setArrastando(item.id)} soltarAlca={() => setArrastando(null)} nome={item.titulo} />
              <p className="min-w-0 flex-1 font-semibold">{item.titulo}</p>
              <ActionForm action={excluirTopico}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="materia_id" value={materiaId} />
                <SubmitButton variant="ghost" size="sm">Remover</SubmitButton>
              </ActionForm>
            </div>
          ) : (
            <details className="rounded-xl border bg-card">
              <summary className="flex cursor-pointer items-center gap-2 px-3 py-3 text-sm font-medium">
                <Alca arrastar={() => setArrastando(item.id)} soltarAlca={() => setArrastando(null)} nome={item.titulo} />
                <span className="min-w-0 flex-1 truncate">{item.ordem}. {item.titulo}</span>
              </summary>
              <div className="space-y-3 border-t px-4 py-4">
                <ActionForm action={salvarAula} className="grid gap-3">
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="materia_id" value={materiaId} />
                  <Field label="Título">
                    <Input name="titulo" defaultValue={item.titulo} required />
                  </Field>
                  <Field label="Disponível em (data e hora de Brasília)">
                    <Input name="libera_em" type="datetime-local" defaultValue={item.liberaEm} />
                  </Field>
                  <Field label="Vídeo (ID do Bunny ou link do YouTube)">
                    <Input name="bunny_video_id" defaultValue={item.video} />
                  </Field>
                  <Field label={item.epubNome ? `Substituir livro (${item.epubNome})` : "Livro digital EPUB"}>
                    <Input name="epub" type="file" accept=".epub" />
                  </Field>
                  <SubmitButton>Salvar aula</SubmitButton>
                </ActionForm>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Arquivos</p>
                  {item.arquivos.map((arquivo) => (
                    <div key={arquivo.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        {arquivo.nome}
                        <span className="text-muted-foreground"> · {rotuloModo(arquivo)}</span>
                      </span>
                      <ActionForm action={excluirArquivoAula}>
                        <input type="hidden" name="id" value={arquivo.id} />
                        <input type="hidden" name="aula_id" value={item.id} />
                        <input type="hidden" name="materia_id" value={materiaId} />
                        <SubmitButton variant="ghost" size="sm">Remover</SubmitButton>
                      </ActionForm>
                    </div>
                  ))}
                  <ActionForm action={adicionarArquivoAula} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_11rem_auto]">
                    <input type="hidden" name="aula_id" value={item.id} />
                    <input type="hidden" name="materia_id" value={materiaId} />
                    <Field label="Nome">
                      <Input name="nome" placeholder="Apostila da aula" required />
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
                <div className="flex gap-2">
                  <ActionForm action={clonarAula}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="materia_id" value={materiaId} />
                    <SubmitButton variant="outline" size="sm" pendingLabel="Clonando...">Clonar</SubmitButton>
                  </ActionForm>
                  <ActionForm action={excluirAula}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="materia_id" value={materiaId} />
                    <input type="hidden" name="epub_path" value={item.epubPath ?? ""} />
                    <SubmitButton variant="ghost" pendingLabel="Excluindo...">Excluir aula</SubmitButton>
                  </ActionForm>
                </div>
              </div>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

function rotuloModo(arquivo: ArquivoAula) {
  if (arquivo.visualizar && arquivo.baixar) return "visualizar e baixar";
  if (arquivo.visualizar) return "visualizar";
  return "baixar";
}

function Alca({ arrastar, soltarAlca, nome }: { arrastar: () => void; soltarAlca: () => void; nome: string }) {
  return (
    <button
      type="button"
      draggable
      aria-label={`Arrastar ${nome}`}
      className="cursor-grab text-muted-foreground active:cursor-grabbing"
      onClick={(evento) => evento.preventDefault()}
      onDragStart={(evento) => {
        evento.stopPropagation();
        evento.dataTransfer.effectAllowed = "move";
        evento.dataTransfer.setData("text/plain", nome);
        arrastar();
      }}
      onDragEnd={soltarAlca}
    >
      <GripVertical className="size-4" />
    </button>
  );
}
