"use client";

import { useEffect, useRef, useState } from "react";
import { salvarProgressoEbook } from "@/actions/estudo";
import { Button } from "@/components/ui/button";

export function EpubReader({
  aulaId,
  cfiInicial,
  url,
  campo = "aula_id",
}: {
  aulaId: string;
  cfiInicial: string | null;
  url?: string;
  campo?: "aula_id" | "topico_id";
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<{ next: () => Promise<void>; prev: () => Promise<void> } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    let destruir = () => {};

    async function abrir() {
      const ePub = (await import("epubjs")).default;
      const resposta = await fetch(url ?? `/api/ebook/${aulaId}`);
      if (!resposta.ok) {
        setErro("Não foi possível abrir o livro.");
        return;
      }
      const buffer = await resposta.arrayBuffer();
      if (!ativo || !caixa.current) return;
      const livro = ePub(buffer);
      destruir = () => livro.destroy();
      const rendition = livro.renderTo(caixa.current, { width: "100%", height: "100%", flow: "paginated" });
      renditionRef.current = rendition;
      await rendition.display(cfiInicial || undefined);
      rendition.on("relocated", (local) => {
        const dados = new FormData();
        dados.set(campo, aulaId);
        dados.set("cfi", local.start.cfi);
        void salvarProgressoEbook(null, dados);
      });
    }

    abrir().catch(() => setErro("Não foi possível abrir o livro."));
    return () => {
      ativo = false;
      destruir();
    };
  }, [aulaId, cfiInicial, url, campo]);

  if (erro) return <p className="text-sm text-red-700">{erro}</p>;

  return (
    <div>
      <div ref={caixa} className="h-[70vh] overflow-hidden rounded-md border bg-white" />
      <div className="mt-3 flex gap-2">
        <Button type="button" variant="outline" onClick={() => void renditionRef.current?.prev()}>
          Página anterior
        </Button>
        <Button type="button" variant="outline" onClick={() => void renditionRef.current?.next()}>
          Próxima página
        </Button>
      </div>
    </div>
  );
}
