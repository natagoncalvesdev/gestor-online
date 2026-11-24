"use client";

import { useState } from "react";
import { editarBanner, excluirBanner } from "@/actions/pagina-inicial";
import { ActionForm } from "@/components/action-form";
import { EnquadramentoImagem } from "@/components/secretaria/enquadramento-imagem";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui/field";

export function EditarBanner({
  id,
  link,
  url,
  zoom,
  x,
  y,
}: {
  id: string;
  link: string;
  url: string | null;
  zoom: number;
  x: number;
  y: number;
}) {
  const [aberto, setAberto] = useState(false);
  if (!aberto) {
    return (
      <button type="button" className="h-8 rounded-md border bg-white px-3 text-sm" onClick={() => setAberto(true)}>
        Editar
      </button>
    );
  }

  return (
    <div className="basis-full space-y-3">
      <ActionForm action={editarBanner} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <EnquadramentoImagem
          url={url}
          zoomInicial={zoom}
          xInicial={x}
          yInicial={y}
          proporcao="aspect-[2/1]"
          dica="Troque a imagem se quiser. Sem novo arquivo, o recorte atual é mantido."
        />
        <Field label="Link ao clicar (opcional)">
          <Input name="link" defaultValue={link} placeholder="https:// ou /loja" />
        </Field>
        <div className="flex flex-wrap gap-2">
          <SubmitButton size="sm">Salvar</SubmitButton>
          <button type="button" className="h-8 rounded-md border bg-white px-3 text-sm" onClick={() => setAberto(false)}>
            Cancelar
          </button>
        </div>
      </ActionForm>
      <ActionForm action={excluirBanner}>
        <input type="hidden" name="id" value={id} />
        <SubmitButton variant="destructive" size="sm" pendingLabel="Removendo...">
          Remover banner
        </SubmitButton>
      </ActionForm>
    </div>
  );
}
