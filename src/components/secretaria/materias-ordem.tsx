"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { reordenarMaterias } from "@/actions/catalogo";
import { cn } from "@/lib/utils";

export type LinhaMateria = {
  id: string;
  nome: string;
  slug: string;
  carga: string;
  aulas: number;
  questoes: number;
  ativo: boolean;
};

export function MateriasOrdem({ itens }: { itens: LinhaMateria[] }) {
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
    const resultado = await reordenarMaterias(proxima.map((linha) => linha.id));
    if ("error" in resultado) toast.error(resultado.error);
  }

  function iniciarArraste(evento: React.DragEvent<HTMLButtonElement>, id: string) {
    evento.dataTransfer.effectAllowed = "move";
    evento.dataTransfer.setData("text/plain", id);
    setArrastando(id);
  }

  return (
    <>
      <div className="hidden md:block">
        <div className="relative w-full overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b">
                <th className="h-10 w-16 px-2 text-left align-middle font-medium">Ordem</th>
                <th className="h-10 px-2 text-left align-middle font-medium">Nome</th>
                <th className="h-10 px-2 text-left align-middle font-medium">Slug</th>
                <th className="h-10 px-2 text-right align-middle font-medium">Carga horária</th>
                <th className="h-10 px-2 text-right align-middle font-medium">Aulas</th>
                <th className="h-10 px-2 text-right align-middle font-medium">Questões</th>
                <th className="h-10 px-2 text-left align-middle font-medium">Status</th>
                <th className="h-10 px-2 text-right align-middle font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {lista.map((materia, indice) => (
                <tr
                  key={materia.id}
                  className={cn(
                    "border-b transition-colors hover:bg-muted/50",
                    arrastando === materia.id && "bg-muted"
                  )}
                  onDragOver={(evento) => evento.preventDefault()}
                  onDrop={() => void soltar(materia.id)}
                >
                  <td className="p-2 align-middle">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        draggable
                        aria-label={`Arrastar ${materia.nome}`}
                        className="cursor-grab rounded-md p-1 text-muted-foreground hover:bg-secondary active:cursor-grabbing"
                        onDragStart={(evento) => iniciarArraste(evento, materia.id)}
                        onDragEnd={() => setArrastando(null)}
                      >
                        <GripVertical className="size-4" />
                      </button>
                      <span className="tabular-nums text-muted-foreground">{indice + 1}</span>
                    </div>
                  </td>
                  <td className="p-2 align-middle font-medium">{materia.nome}</td>
                  <td className="p-2 align-middle">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{materia.slug}</code>
                  </td>
                  <td className="p-2 text-right align-middle tabular-nums">{materia.carga}</td>
                  <td className="p-2 text-right align-middle tabular-nums">{materia.aulas}</td>
                  <td className="p-2 text-right align-middle tabular-nums">{materia.questoes}</td>
                  <td className="p-2 align-middle">
                    <StatusMateria ativo={materia.ativo} />
                  </td>
                  <td className="p-2 text-right align-middle">
                    <Link
                      href={`/secretaria/materias/${materia.id}`}
                      className="inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium hover:bg-secondary"
                    >
                      Gerenciar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {lista.map((materia, indice) => (
          <li
            key={materia.id}
            className={cn(
              "flex flex-col gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/10",
              arrastando === materia.id && "bg-muted"
            )}
            onDragOver={(evento) => evento.preventDefault()}
            onDrop={() => void soltar(materia.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <button
                  type="button"
                  draggable
                  aria-label={`Arrastar ${materia.nome}`}
                  className="mt-0.5 cursor-grab text-muted-foreground active:cursor-grabbing"
                  onDragStart={(evento) => iniciarArraste(evento, materia.id)}
                  onDragEnd={() => setArrastando(null)}
                >
                  <GripVertical className="size-4" />
                </button>
                <div className="min-w-0">
                  <p className="font-medium">
                    <span className="mr-2 tabular-nums text-muted-foreground">{indice + 1}</span>
                    {materia.nome}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <code className="text-xs">{materia.slug}</code>
                    {" · "}
                    {materia.carga} · {materia.aulas} aulas · {materia.questoes} questões
                  </p>
                </div>
              </div>
              <StatusMateria ativo={materia.ativo} />
            </div>
            <Link
              href={`/secretaria/materias/${materia.id}`}
              className="inline-flex h-8 w-full items-center justify-center rounded-md border bg-white text-xs font-medium hover:bg-secondary"
            >
              Gerenciar
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function StatusMateria({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium",
        ativo ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
      )}
    >
      {ativo ? "Ativa" : "Inativa"}
    </span>
  );
}
