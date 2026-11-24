"use client";

import { useState } from "react";
import { excluirProduto } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export function ExcluirProduto({ id, nome }: { id: string; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const confere = texto.trim() === nome.trim();

  function abrir() {
    setTexto("");
    setAberto(true);
  }

  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={abrir}>
        Remover produto
      </Button>
      {aberto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="excluir-produto-titulo" className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg">
            <h2 id="excluir-produto-titulo" className="text-lg font-semibold text-red-700">
              Remover produto
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Digite o nome do produto para confirmar a exclusão. Esta ação não pode ser desfeita.
            </p>
            <p className="mt-3 text-sm font-medium">{nome}</p>
            <ActionForm action={excluirProduto} className="mt-3 flex flex-col gap-4">
              <input type="hidden" name="id" value={id} />
              <Input
                name="confirmacao"
                value={texto}
                autoFocus
                autoComplete="off"
                placeholder="Nome do produto"
                onChange={(evento) => setTexto(evento.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAberto(false)}>
                  Cancelar
                </Button>
                <SubmitButton variant="destructive" size="sm" pendingLabel="Excluindo..." disabled={!confere}>
                  Excluir
                </SubmitButton>
              </div>
            </ActionForm>
          </div>
        </div>
      ) : null}
    </>
  );
}
