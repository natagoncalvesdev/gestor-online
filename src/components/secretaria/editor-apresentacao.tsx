"use client";

import { useEffect, useRef } from "react";
import { Bold, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { limparHtmlApresentacao } from "@/lib/html-apresentacao";

const TAMANHOS = [
  { id: "tam-pequeno", rotulo: "Pequena" },
  { id: "tam-normal", rotulo: "Normal" },
  { id: "tam-grande", rotulo: "Grande" },
  { id: "tam-titulo", rotulo: "Título" },
] as const;

function envolverClasse(classe: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;
  const span = document.createElement("span");
  span.className = classe;
  try {
    range.surroundContents(span);
  } catch {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  }
  sel.removeAllRanges();
}

export function EditorApresentacao({
  valorInicial = "",
  name = "apresentacao",
  compacto = false,
  dica,
}: {
  valorInicial?: string;
  name?: string;
  compacto?: boolean;
  dica?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const limpo = limparHtmlApresentacao(valorInicial);
    if (limpo && editor.innerHTML !== limpo) {
      editor.innerHTML = limpo;
      if (campoRef.current) campoRef.current.value = limpo;
    }
  }, [valorInicial]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const form = editor.closest("form");
    if (!form) return;
    const sincronizar = () => {
      if (campoRef.current) campoRef.current.value = editor.innerHTML;
    };
    form.addEventListener("submit", sincronizar);
    return () => form.removeEventListener("submit", sincronizar);
  }, []);

  function atualizarCampo(editor: HTMLDivElement) {
    if (campoRef.current) campoRef.current.value = editor.innerHTML;
  }

  function atualizar() {
    if (editorRef.current) atualizarCampo(editorRef.current);
  }

  function colar(evento: React.ClipboardEvent<HTMLDivElement>) {
    evento.preventDefault();
    const html = evento.clipboardData.getData("text/html");
    const texto = evento.clipboardData.getData("text/plain");
    if (html) {
      document.execCommand("insertHTML", false, limparHtmlApresentacao(html));
    } else {
      document.execCommand("insertText", false, texto);
    }
    atualizar();
  }

  function comando(fn: () => void) {
    editorRef.current?.focus();
    fn();
    atualizar();
  }

  return (
    <div className="space-y-2">
      <input ref={campoRef} type="hidden" name={name} defaultValue={valorInicial} />
      <div className="flex flex-wrap gap-2 rounded-t-md border border-b-0 bg-secondary/50 p-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 bg-white"
          onClick={() => comando(() => document.execCommand("bold"))}
        >
          <Bold className="size-3.5" />
          Negrito
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 bg-white"
          onClick={() => comando(() => document.execCommand("insertUnorderedList"))}
        >
          <List className="size-3.5" />
          Lista
        </Button>
        {TAMANHOS.map((tamanho) => (
          <Button
            key={tamanho.id}
            type="button"
            variant="outline"
            size="sm"
            className="h-8 bg-white"
            onClick={() => comando(() => envolverClasse(tamanho.id))}
          >
            {tamanho.rotulo}
          </Button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className={
          compacto
            ? "apresentacao min-h-28 rounded-b-md border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            : "apresentacao min-h-56 rounded-b-md border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring"
        }
        onInput={atualizar}
        onPaste={colar}
      />
      {dica ? <p className="text-xs text-muted-foreground">{dica}</p> : null}
    </div>
  );
}