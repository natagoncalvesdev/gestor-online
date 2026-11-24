"use client";

import { useState } from "react";
import { FileText, Info } from "lucide-react";
import { Apresentacao } from "@/components/loja/apresentacao";
import { cn } from "@/lib/utils";

export function AbasProduto({
  apresentacao,
  infos,
}: {
  apresentacao: string;
  infos: { id: string; nome: string; valor: string }[];
}) {
  const temDescricao = Boolean(apresentacao.trim());
  const temInfo = infos.length > 0;
  const [aba, setAba] = useState<"descricao" | "info">(temDescricao ? "descricao" : "info");

  if (!temDescricao && !temInfo) return null;

  return (
    <section className="w-full" aria-label="Detalhes do produto">
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <div
          className="flex flex-wrap gap-2 border-b border-border bg-muted/35 px-3 py-2.5 sm:px-4"
          role="tablist"
        >
          {temDescricao ? (
            <button
              type="button"
              role="tab"
              aria-selected={aba === "descricao"}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                aba === "descricao"
                  ? "bg-background text-primary shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
              onClick={() => setAba("descricao")}
            >
              <FileText className="size-4 shrink-0 opacity-80" aria-hidden />
              Descrição
            </button>
          ) : null}
          {temInfo ? (
            <button
              type="button"
              role="tab"
              aria-selected={aba === "info"}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                aba === "info"
                  ? "bg-background text-primary shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
              )}
              onClick={() => setAba("info")}
            >
              <Info className="size-4 shrink-0 opacity-80" aria-hidden />
              Informação adicional
            </button>
          ) : null}
        </div>

        <div className="px-5 py-7 sm:px-8 sm:py-9" role="tabpanel">
          {aba === "descricao" && temDescricao ? (
            <Apresentacao
              html={apresentacao}
              className="max-w-3xl text-base leading-relaxed text-foreground [&_p:first-child]:mt-0"
            />
          ) : null}
          {aba === "info" && temInfo ? (
            <dl className="max-w-3xl overflow-hidden rounded-lg border border-border/70">
              {infos.map((linha, indice) => (
                <div
                  key={linha.id}
                  className={cn(
                    "grid gap-1 border-b border-border/60 px-4 py-3.5 last:border-b-0 sm:grid-cols-[minmax(9rem,13rem)_1fr] sm:gap-6 sm:px-5 sm:py-4",
                    indice % 2 === 0 ? "bg-muted/25" : "bg-background",
                  )}
                >
                  <dt className="text-sm font-semibold text-foreground">{linha.nome}</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground">{linha.valor}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>
    </section>
  );
}