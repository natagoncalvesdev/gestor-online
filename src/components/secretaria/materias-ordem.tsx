"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { reordenarMaterias } from "@/actions/catalogo";

export type LinhaMateria = {
  id: string;
  nome: string;
  codigo: string;
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

  return lista.map((materia, indice) => (
    <tr
      key={materia.id}
      className={`border-b last:border-0 ${arrastando === materia.id ? "bg-secondary" : ""}`}
      onDragOver={(evento) => evento.preventDefault()}
      onDrop={() => void soltar(materia.id)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            draggable
            aria-label={`Arrastar ${materia.nome}`}
            className="cursor-grab text-muted-foreground active:cursor-grabbing"
            onDragStart={(evento) => {
              evento.dataTransfer.effectAllowed = "move";
              evento.dataTransfer.setData("text/plain", materia.id);
              setArrastando(materia.id);
            }}
            onDragEnd={() => setArrastando(null)}
          >
            <GripVertical className="size-4" />
          </button>
          <span className="tabular-nums text-muted-foreground">{indice + 1}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-medium">{materia.nome}</td>
      <td className="px-4 py-3">
        <span className="inline-flex rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{materia.codigo}</span>
      </td>
      <td className="px-4 py-3 tabular-nums">{materia.carga}</td>
      <td className="px-4 py-3 tabular-nums">{materia.aulas}</td>
      <td className="px-4 py-3 tabular-nums">{materia.questoes}</td>
      <td className="px-4 py-3">
        <span className={materia.ativo ? "inline-flex h-5 items-center rounded-full bg-primary px-2 text-xs font-medium text-primary-foreground" : "inline-flex h-5 items-center rounded-full bg-secondary px-2 text-xs font-medium text-muted-foreground"}>
          {materia.ativo ? "Ativa" : "Inativa"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <Link href={`/secretaria/materias/${materia.id}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Gerenciar
        </Link>
      </td>
    </tr>
  ));
}
