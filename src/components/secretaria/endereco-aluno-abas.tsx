"use client";

import { useState } from "react";
import { EnderecoCampos } from "@/components/endereco-campos";
import { cn } from "@/lib/utils";
import type { DadosEndereco } from "@/lib/supabase/types";

type AbaEndereco = "entrega" | "cobranca";

const ABAS: { id: AbaEndereco; rotulo: string }[] = [
  { id: "entrega", rotulo: "Entrega" },
  { id: "cobranca", rotulo: "Cobrança" },
];

export function EnderecoAlunoAbas({
  enderecoEntrega,
  enderecoCobranca,
}: {
  enderecoEntrega: DadosEndereco;
  enderecoCobranca: DadosEndereco;
}) {
  const [ativa, setAtiva] = useState<AbaEndereco>("entrega");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full flex-wrap gap-1 border-b">
        {ABAS.map((aba) => {
          const selecionada = aba.id === ativa;
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
      <div className={ativa === "entrega" ? "block" : "hidden"} aria-hidden={ativa !== "entrega"}>
        <EnderecoCampos finalidade="entrega" endereco={enderecoEntrega} exibirTitulo={false} />
      </div>
      <div className={ativa === "cobranca" ? "block" : "hidden"} aria-hidden={ativa !== "cobranca"}>
        <EnderecoCampos finalidade="cobranca" endereco={enderecoCobranca} exibirTitulo={false} />
      </div>
    </div>
  );
}