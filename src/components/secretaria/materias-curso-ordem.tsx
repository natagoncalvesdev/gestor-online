"use client";

import { useEffect, useState } from "react";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { reordenarMateriasProduto, removerMateriaProduto } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";

export function MateriasCursoOrdem({
  produtoId,
  itens,
}: {
  produtoId: string;
  itens: { id: string; nome: string; codigo: string }[];
}) {
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
    const resultado = await reordenarMateriasProduto(produtoId, proxima.map((linha) => linha.id));
    if ("error" in resultado) toast.error(resultado.error);
  }

  if (lista.length === 0) {
    return (
      <tr>
        <td colSpan={4} className="px-4 py-3 text-muted-foreground">
          Nenhuma matéria. A compra deste produto não abre estudo.
        </td>
      </tr>
    );
  }

  return lista.map((item, indice) => (
    <tr
      key={item.id}
      className={`border-b last:border-0 ${arrastando === item.id ? "bg-secondary" : ""}`}
      onDragOver={(evento) => evento.preventDefault()}
      onDrop={() => void soltar(item.id)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            draggable
            aria-label={`Arrastar ${item.nome}`}
            className="cursor-grab text-muted-foreground active:cursor-grabbing"
            onDragStart={(evento) => {
              evento.dataTransfer.effectAllowed = "move";
              evento.dataTransfer.setData("text/plain", item.id);
              setArrastando(item.id);
            }}
            onDragEnd={() => setArrastando(null)}
          >
            <GripVertical className="size-4" />
          </button>
          <span className="tabular-nums text-muted-foreground">{indice + 1}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-medium">{item.nome}</td>
      <td className="px-4 py-3 text-muted-foreground">{item.codigo}</td>
      <td className="px-4 py-3 text-right">
        <ActionForm action={removerMateriaProduto}>
          <input type="hidden" name="produto_id" value={produtoId} />
          <input type="hidden" name="materia_id" value={item.id} />
          <SubmitButton variant="ghost" size="sm" className="text-destructive">
            Remover
          </SubmitButton>
        </ActionForm>
      </td>
    </tr>
  ));
}
