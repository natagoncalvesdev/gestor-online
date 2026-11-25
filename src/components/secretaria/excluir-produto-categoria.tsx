"use client";

import { useState } from "react";
import { excluirProdutoCategoria } from "@/actions/produto-categoria";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/field";

export function ExcluirProdutoCategoria({ id, nome, sistema }: { id: string; nome: string; sistema: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const confere = texto.trim() === nome.trim();

  if (sistema) {
    return <p className="text-xs text-muted-foreground">Categoria do sistema (não pode ser excluída).</p>;
  }

  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
      <button
        type="button"
        onClick={() => {
          setTexto("");
          setAberto((valor) => !valor);
        }}
        className="text-sm font-medium text-destructive underline-offset-4 hover:underline"
      >
        {aberto ? "Cancelar exclusão" : "Excluir categoria"}
      </button>
      {aberto ? (
        <ActionForm action={excluirProdutoCategoria} className="mt-3 grid gap-3">
          <input type="hidden" name="id" value={id} />
          <p className="text-sm text-muted-foreground">
            Para confirmar, digite <strong>{nome}</strong> abaixo.
          </p>
          <Input
            name="confirmacao"
            value={texto}
            autoComplete="off"
            onChange={(evento) => setTexto(evento.target.value)}
          />
          <SubmitButton variant="destructive" disabled={!confere}>
            Excluir permanentemente
          </SubmitButton>
        </ActionForm>
      ) : null}
    </div>
  );
}