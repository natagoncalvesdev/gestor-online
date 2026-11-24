"use client";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Apresentacao } from "@/components/loja/apresentacao";
import { useCarrinho } from "@/components/loja/carrinho-provider";
import { formatBRL } from "@/lib/format";
import { adicionarAoCarrinho, resumoDescricao } from "@/lib/carrinho";
import { useState } from "react";

export type { ItemCarrinho } from "@/lib/carrinho";
export { gravarCarrinho, lerCarrinho } from "@/lib/carrinho";

export function ComprarBox({
  produtoId,
  nome,
  preco,
  precoDe = null,
  descricaoCurta = "",
  imagemUrl = null,
  variacoes,
}: {
  produtoId: string;
  nome: string;
  preco: number;
  precoDe?: number | null;
  descricaoCurta?: string;
  imagemUrl?: string | null;
  variacoes: { id: string; nome: string; preco: number }[];
}) {
  const { abrirPainel, recarregar } = useCarrinho();
  const [variacaoId, setVariacaoId] = useState(variacoes[0]?.id ?? "");
  const escolhida = variacoes.find((item) => item.id === variacaoId);
  const valor = escolhida?.preco ?? preco;

  function adicionar() {
    adicionarAoCarrinho({
      produtoId,
      variacaoId: escolhida?.id ?? null,
      nome: escolhida ? `${nome} — ${escolhida.nome}` : nome,
      preco: valor,
      imagemUrl,
      descricaoResumo: descricaoCurta ? resumoDescricao(descricaoCurta) : undefined,
    });
    recarregar();
    abrirPainel();
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