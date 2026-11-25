"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { reordenarProdutos } from "@/actions/catalogo";

export type LinhaProdutoSecretaria = {
  id: string;
  nome: string;
  slug: string;
  imagemUrl: string | null;
  preco: string;
  precoDe: string | null;
  estoqueTexto: string;
  estoqueClassName: string;
  categorias: { id: string; nome: string; profundidade: number }[];
  ativo: boolean;
  dataPublicacao: string;
};

function CabecalhoOrdenavel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <span className="inline-flex flex-col text-muted-foreground/70">
        <ChevronUp className="size-3 -mb-1" aria-hidden />
        <ChevronDown className="size-3" aria-hidden />
      </span>
    </span>
  );
}

export function TabelaProdutosSecretaria({ itens }: { itens: LinhaProdutoSecretaria[] }) {
  const [lista, setLista] = useState(itens);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const assinatura = itens.map((item) => item.id).join(",");

  useEffect(() => {
    setLista(itens);
  }, [assinatura, itens]);

  const todosMarcados = lista.length > 0 && lista.every((item) => selecionados.has(item.id));

  function alternarTodos() {
    if (todosMarcados) setSelecionados(new Set());
    else setSelecionados(new Set(lista.map((item) => item.id)));
  }

  function alternarUm(id: string) {
    setSelecionados((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

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

  return (
    <>
      <thead>
        <tr className="border-b bg-slate-50 text-left text-[13px] text-foreground">
          <th className="w-10 px-3 py-2.5">
            <input
              type="checkbox"
              checked={todosMarcados}
              onChange={alternarTodos}
              aria-label="Selecionar todos os produtos"
              className="size-4 accent-primary"
            />
          </th>
          <th className="w-12 px-1 py-2.5" aria-hidden />
          <th className="px-3 py-2.5 font-semibold">
            <CabecalhoOrdenavel>Nome</CabecalhoOrdenavel>
          </th>
          <th className="px-3 py-2.5 font-semibold">
            <CabecalhoOrdenavel>SKU</CabecalhoOrdenavel>
          </th>
          <th className="px-3 py-2.5 font-semibold">Estoque</th>
          <th className="px-3 py-2.5 font-semibold">
            <CabecalhoOrdenavel>Preço</CabecalhoOrdenavel>
          </th>
          <th className="px-3 py-2.5 font-semibold">Categorias</th>
          <th className="px-3 py-2.5 font-semibold">
            <CabecalhoOrdenavel>Data</CabecalhoOrdenavel>
          </th>
          <th className="px-3 py-2.5 text-right font-semibold">Ações</th>
        </tr>
      </thead>
      <tbody>
        {lista.map((produto) => (
          <tr
            key={produto.id}
            className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/80 ${arrastando === produto.id ? "bg-secondary" : "bg-white"}`}
            onDragOver={(evento) => evento.preventDefault()}
            onDrop={() => void soltar(produto.id)}
          >
            <td className="px-3 py-3 align-middle">
              <input
                type="checkbox"
                checked={selecionados.has(produto.id)}
                onChange={() => alternarUm(produto.id)}
                aria-label={`Selecionar ${produto.nome}`}
                className="size-4 accent-primary"
              />
            </td>
            <td className="px-1 py-3 align-middle">
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
            </td>
            <td className="px-3 py-3 align-middle">
              <div className="flex min-w-0 items-center gap-2">
                {produto.imagemUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={produto.imagemUrl} alt="" className="size-9 shrink-0 rounded border object-cover" width={36} height={36} />
                ) : (
                  <div className="flex size-9 shrink-0 items-center justify-center rounded border bg-secondary text-[10px] text-muted-foreground">—</div>
                )}
                <Link
                  href={`/secretaria/produtos/${produto.id}`}
                  className="truncate font-medium text-[#2271b1] underline-offset-2 hover:underline"
                  title={produto.nome}
                >
                  {produto.nome}
                </Link>
              </div>
            </td>
            <td className="truncate px-3 py-3 align-middle text-muted-foreground" title={produto.slug}>
              {produto.slug}
            </td>
            <td className={`px-3 py-3 align-middle text-sm font-medium ${produto.estoqueClassName}`}>{produto.estoqueTexto}</td>
            <td className="px-3 py-3 align-middle tabular-nums text-foreground">
              {produto.preco}
              {produto.precoDe ? <span className="mt-0.5 block text-xs text-muted-foreground line-through">{produto.precoDe}</span> : null}
            </td>
            <td className="px-3 py-3 align-middle text-[#2271b1]">
              {produto.categorias.length === 0 ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <span className="flex flex-wrap gap-x-1 gap-y-0.5 leading-snug">
                  {produto.categorias.map((cat, indice) => (
                    <span key={cat.id} className="inline-flex items-baseline">
                      {indice > 0 ? <span className="text-muted-foreground">, </span> : null}
                      <Link href={`/secretaria/produtos/categorias/${cat.id}`} className="hover:underline">
                        {cat.nome}
                      </Link>
                    </span>
                  ))}
                </span>
              )}
            </td>
            <td className="px-3 py-3 align-middle text-sm">
              <span className="block text-foreground">{produto.ativo ? "Publicado" : "Rascunho"}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{produto.dataPublicacao}</span>
            </td>
            <td className="px-3 py-3 text-right align-middle">
              <Link
                href={`/secretaria/produtos/${produto.id}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Gerenciar
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </>
  );
}