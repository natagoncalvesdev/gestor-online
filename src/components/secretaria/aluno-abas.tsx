"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function AlunoAbas({
  abas,
}: {
  abas: { id: string; rotulo: string; conteudo: React.ReactNode }[];
}) {
  const [ativa, setAtiva] = useState(abas[0]?.id ?? "");
  const atual = abas.find((aba) => aba.id === ativa) ?? abas[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full flex-wrap gap-1 border-b">
        {abas.map((aba) => {
          const selecionada = aba.id === atual?.id;
          return (
            <button
              key={aba.id}
              type="button"
              onClick={() => setAtiva(aba.id)}
              className={cn(
                "relative px-3 py-2 text-sm font-medium",
                selecionada ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {aba.rotulo}
              {selecionada ? <span className="absolute inset-x-2 -bottom-px h-0.5 bg-foreground" /> : null}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-6">{atual?.conteudo}</div>
    </div>
  );
}
