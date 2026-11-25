"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { reordenarProdutoCategorias } from "@/actions/produto-categoria";
import { recuoHierarquiaCategoria } from "@/lib/produto-categoria";
import { cn } from "@/lib/utils";
export type LinhaCategoriaProduto = {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  pai_id: string | null;
  profundidade: number;
  contagem: number;
  ativo: boolean;
  sistema: boolean;
};

export function CategoriasProdutoOrdem({ itens }: { itens: LinhaCategoriaProduto[] }) {
  const [lista, setLista] = useState(itens);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const assinatura = itens.map((item) => `${item.id}:${item.contagem}`).join(",");

  useEffect(() => {
    setLista(itens);
  }, [assinatura, itens]);

  const irmaosPorPai = useMemo(() => {
    const mapa = new Map<string | null, string[]>();
    for (const item of lista) {
      const chave = item.pai_id;
      const ids = mapa.get(chave) ?? [];
      ids.push(item.id);
      mapa.set(chave, ids);
    }
    return mapa;
  }, [lista]);

  async function soltar(destinoId: string) {
    const origemId = arrastando;
    setArrastando(null);
    if (!origemId || origemId === destinoId) return;

    const origem = lista.find((item) => item.id === origemId);
    const destino = lista.find((item) => item.id === destinoId);
    if (!origem || !destino || origem.pai_id === null) {
      toast.error("Categorias principais não podem ser reordenadas.");
      return;
    }
    if (origem.pai_id !== destino.pai_id) {
      toast.error("Reordene apenas entre irmãs da mesma categoria pai.");
      return;
    }

    const irmaos = lista.filter((item) => item.pai_id === origem.pai_id);
    const origemIndice = irmaos.findIndex((item) => item.id === origemId);
    const destinoIndice = irmaos.findIndex((item) => item.id === destinoId);
    if (origemIndice < 0 || destinoIndice < 0) return;

    const reordenados = [...irmaos];
    const [movido] = reordenados.splice(origemIndice, 1);
    reordenados.splice(destinoIndice, 0, movido);

    const idsReordenados = new Set(reordenados.map((item) => item.id));
    const proxima = lista.map((item) => item);
    const substitutos = new Map(reordenados.map((item, indice) => [item.id, { ...item, ordem: indice + 1 }]));
    for (let i = 0; i < proxima.length; i += 1) {
      if (idsReordenados.has(proxima[i].id)) {
        proxima[i] = substitutos.get(proxima[i].id)!;
      }
    }
    setLista(proxima);

    const resultado = await reordenarProdutoCategorias(
      origem.pai_id,
      reordenados.map((item) => item.id),
    );
    if ("error" in resultado) toast.error(resultado.error);
  }

  function podeArrastar(id: string) {
    const item = lista.find((linha) => linha.id === id);
    if (!item || item.pai_id === null) return false;
    return (irmaosPorPai.get(item.pai_id)?.length ?? 0) > 1;
  }

  function podeSoltar(destinoId: string) {
    if (!arrastando) return false;
    const origem = lista.find((item) => item.id === arrastando);
    const destino = lista.find((item) => item.id === destinoId);
    if (!origem || !destino || origem.pai_id === null) return false;
    return origem.pai_id === destino.pai_id;
  }

  return lista.map((categoria, indice) => {
    const ehRaiz = categoria.profundidade === 0;
    const separarGrupo = ehRaiz && indice > 0;
    return (
      <tr
        key={categoria.id}
        className={cn(
          "border-b last:border-0",
          separarGrupo && "border-t-8 border-t-slate-100",
          arrastando === categoria.id ? "bg-secondary" : ehRaiz ? "bg-white" : "bg-white",
        )}
        onDragOver={(evento) => {
          if (podeSoltar(categoria.id)) evento.preventDefault();
        }}
        onDrop={() => {
          if (podeSoltar(categoria.id)) void soltar(categoria.id);
        }}
      >
        <td className="px-4 py-3">
          {podeArrastar(categoria.id) ? (
            <button
              type="button"
              draggable
              aria-label={`Arrastar ${categoria.nome}`}
              className="cursor-grab text-muted-foreground active:cursor-grabbing"
              onDragStart={(evento) => {
                evento.dataTransfer.effectAllowed = "move";
                evento.dataTransfer.setData("text/plain", categoria.id);
                setArrastando(categoria.id);
              }}
              onDragEnd={() => setArrastando(null)}
            >
              <GripVertical className="size-4" />
            </button>
          ) : (
            <span className="inline-block size-4" />
          )}
        </td>
        <td
          className={cn(
            "px-4 py-2.5 whitespace-nowrap",
            ehRaiz ? "pt-3 font-semibold text-foreground" : "pb-2.5 font-normal text-muted-foreground",
          )}
          style={recuoHierarquiaCategoria(categoria.profundidade, 1)}
        >
          {categoria.nome}
        </td>
        <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">{categoria.descricao || "—"}</td>
        <td className="px-4 py-3 text-muted-foreground">{categoria.slug}</td>
        <td className="px-4 py-3 tabular-nums">{categoria.contagem}</td>
        <td className="px-4 py-3">
          <span
            className={
              categoria.ativo
                ? "inline-flex h-5 items-center rounded-full bg-primary px-2 text-xs font-medium text-primary-foreground"
                : "inline-flex h-5 items-center rounded-full bg-secondary px-2 text-xs font-medium text-muted-foreground"
            }
          >
            {categoria.ativo ? "Ativa" : "Inativa"}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <Link
            href={`/secretaria/produtos/categorias/${categoria.id}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Editar
          </Link>
        </td>
      </tr>
    );
  });
}