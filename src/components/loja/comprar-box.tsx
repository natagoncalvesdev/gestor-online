"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { formatBRL } from "@/lib/format";
import { useState } from "react";

export type ItemCarrinho = {
  produtoId: string;
  variacaoId: string | null;
  nome: string;
  preco: number;
  cursoNome: string | null;
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
  cursoNome,
  variacoes,
}: {
  produtoId: string;
  nome: string;
  preco: number;
  cursoNome: string | null;
  variacoes: { id: string; nome: string; preco: number }[];
}) {
  const [variacaoId, setVariacaoId] = useState(variacoes[0]?.id ?? "");
  const escolhida = variacoes.find((item) => item.id === variacaoId);

  function adicionar() {
    const atual = lerCarrinho().filter(
      (item) => !(item.produtoId === produtoId && item.variacaoId === (escolhida?.id ?? null))
    );
    atual.push({
      produtoId,
      variacaoId: escolhida?.id ?? null,
      nome: escolhida ? `${nome} — ${escolhida.nome}` : nome,
      preco: escolhida ? escolhida.preco : preco,
      cursoNome,
    });
    gravarCarrinho(atual);
    toast.success("Produto adicionado ao carrinho.");
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <p className="text-2xl font-semibold">{formatBRL(escolhida?.preco ?? preco)}</p>
      {variacoes.length > 0 ? (
        <label className="block space-y-1 text-sm">
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
      <p className="text-sm text-muted-foreground">
        {cursoNome ? `Inclui o curso ${cursoNome}.` : "Este produto não libera curso."}
      </p>
      <Button type="button" variant="accent" onClick={adicionar}>
        Adicionar ao carrinho
      </Button>
    </div>
  );
}
