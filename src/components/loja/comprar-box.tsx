"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Apresentacao } from "@/components/loja/apresentacao";
import { formatBRL } from "@/lib/format";
import { useState } from "react";

export type ItemCarrinho = {
  produtoId: string;
  variacaoId: string | null;
  nome: string;
  preco: number;
};

const CHAVE = "gestor-online-carrinho";

export function lerCarrinho(): ItemCarrinho[] {
  if (typeof window === "undefined") return [];
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) || "[]") as ItemCarrinho[];
    return Array.isArray(bruto) ? bruto : [];
  } catch {
    return [];
  }
}

export function gravarCarrinho(itens: ItemCarrinho[]) {
  localStorage.setItem(CHAVE, JSON.stringify(itens));
}

export function ComprarBox({
  produtoId,
  nome,
  preco,
  precoDe = null,
  descricaoCurta = "",
  variacoes,
}: {
  produtoId: string;
  nome: string;
  preco: number;
  precoDe?: number | null;
  descricaoCurta?: string;
  variacoes: { id: string; nome: string; preco: number }[];
}) {
  const [variacaoId, setVariacaoId] = useState(variacoes[0]?.id ?? "");
  const escolhida = variacoes.find((item) => item.id === variacaoId);
  const valor = escolhida?.preco ?? preco;

  function adicionar() {
    const atual = lerCarrinho().filter(
      (item) => !(item.produtoId === produtoId && item.variacaoId === (escolhida?.id ?? null))
    );
    atual.push({
      produtoId,
      variacaoId: escolhida?.id ?? null,
      nome: escolhida ? `${nome} — ${escolhida.nome}` : nome,
      preco: valor,
    });
    gravarCarrinho(atual);
    toast.success("Produto adicionado ao carrinho.");
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {!escolhida && precoDe != null ? (
          <span className="text-lg text-muted-foreground line-through">{formatBRL(precoDe)}</span>
        ) : null}
        <span className="text-3xl font-bold tracking-tight">{formatBRL(valor)}</span>
      </div>
      {variacoes.length > 0 ? (
        <label className="block max-w-sm space-y-1 text-sm">
          <span className="font-medium">Opção</span>
          <Select value={variacaoId} onChange={(event) => setVariacaoId(event.target.value)}>
            {variacoes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome} — {formatBRL(item.preco)}
              </option>
            ))}
          </Select>
        </label>
      ) : null}
      {descricaoCurta ? (
        <div className="max-w-xl [&_.apresentacao>p:first-child]:mt-0">
          <Apresentacao html={descricaoCurta} />
        </div>
      ) : null}
      <Button type="button" className="h-12 w-full max-w-md uppercase tracking-wide" onClick={adicionar}>
        Adicionar ao carrinho
      </Button>
    </div>
  );
}