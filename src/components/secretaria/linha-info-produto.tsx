"use client";

import { useState } from "react";
import { excluirInfoProduto, salvarInfoProduto } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LinhaInfoProduto({
  id,
  produtoId,
  nome,
  valor,
  ordem,
}: {
  id: string;
  produtoId: string;
  nome: string;
  valor: string;
  ordem: number;
}) {
  const [editando, setEditando] = useState(false);

  if (!editando) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-md border px-3 py-1 text-sm">
        <span>
          <strong>{nome}</strong>
          {valor ? <span className="text-muted-foreground"> — {valor}</span> : null}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => setEditando(true)}>
            Editar
          </Button>
          <ActionForm action={excluirInfoProduto}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="produto_id" value={produtoId} />
            <SubmitButton variant="ghost" size="sm" className="h-7">
              Excluir
            </SubmitButton>
          </ActionForm>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-md border p-3">
      <ActionForm action={salvarInfoProduto} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto_auto] sm:items-end">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="produto_id" value={produtoId} />
        <input type="hidden" name="ordem" value={ordem} />
        <Field label="Nome">
          <Input name="nome" defaultValue={nome} required />
        </Field>
        <Field label="Valor">
          <Input name="valor" defaultValue={valor} />
        </Field>
        <SubmitButton size="sm">Salvar</SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(false)}>
          Cancelar
        </Button>
      </ActionForm>
    </li>
  );
}
