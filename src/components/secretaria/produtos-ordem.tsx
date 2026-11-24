"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { reordenarProdutos } from "@/actions/catalogo";

export type LinhaProduto = {
  id: string;
  nome: string;
  preco: string;
  precoDe: string | null;
  peso: string;
  medidas: string;
  materias: number;
  ativo: boolean;
};

export function ProdutosOrdem({ itens }: { itens: LinhaProduto[] }) {
  const [lista, setLista] = useState(itens);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const assinatura = itens.map((item) => item.id).join(",");

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
    const resultado = await reordenarProdutos(proxima.map((linha) => linha.id));
    if ("error" in resultado) toast.error(resultado.error);
  }

  return lista.map((produto, indice) => (
    <tr
      key={produto.id}
      className={`border-b last:border-0 ${arrastando === produto.id ? "bg-secondary" : ""}`}
      onDragOver={(evento) => evento.preventDefault()}
      onDrop={() => void soltar(produto.id)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            draggable
            aria-label={`Arrastar ${produto.nome}`}
            className="cursor-grab text-muted-foreground active:cursor-grabbing"
            onDragStart={(evento) => {
              evento.dataTransfer.effectAllowed = "move";
              evento.dataTransfer.setData("text/plain", produto.id);
              setArrastando(produto.id);
            }}
            onDragEnd={() => setArrastando(null)}
          >
            <GripVertical className="size-4" />
          </button>
          <span className="tabular-nums text-muted-foreground">{indice + 1}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-medium">{produto.nome}</td>
      <td className="px-4 py-3 tabular-nums">
        {produto.preco}
        {produto.precoDe ? <span className="mt-0.5 block text-xs text-muted-foreground line-through">{produto.precoDe}</span> : null}
      </td>
      <td className="px-4 py-3 tabular-nums">{produto.peso}</td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground">{produto.medidas}</td>
      <td className="px-4 py-3 tabular-nums">{produto.materias}</td>
      <td className="px-4 py-3">
        <span className={produto.ativo ? "inline-flex h-5 items-center rounded-full bg-primary px-2 text-xs font-medium text-primary-foreground" : "inline-flex h-5 items-center rounded-full bg-secondary px-2 text-xs font-medium text-muted-foreground"}>
          {produto.ativo ? "Ativo" : "Inativo"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <Link href={`/secretaria/produtos/${produto.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
          Gerenciar
        </Link>
      </td>
    </tr>
  ));
}
