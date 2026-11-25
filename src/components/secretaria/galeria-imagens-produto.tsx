"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { excluirImagemProduto, salvarImagemProduto } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { EnquadramentoImagem } from "@/components/secretaria/enquadramento-imagem";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { urlImagemProduto } from "@/lib/produto-imagem";

type ImagemProduto = {
  id: string;
  path: string;
  imagem_zoom: number;
  imagem_x: number;
  imagem_y: number;
};

export function GaleriaImagensProduto({ produtoId, imagens }: { produtoId: string; imagens: ImagemProduto[] }) {
  const [aberta, setAberta] = useState<ImagemProduto | null>(null);
  const url = aberta ? urlImagemProduto(aberta.path) : null;

  useEffect(() => {
    if (!aberta) return;
    function fechar(evento: KeyboardEvent) {
      if (evento.key === "Escape") setAberta(null);
    }
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [aberta]);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {imagens.map((imagem) => {
          const miniatura = urlImagemProduto(imagem.path);
          if (!miniatura) return null;
          return (
            <button
              key={imagem.id}
              type="button"
              onClick={() => setAberta(imagem)}
              aria-label="Editar imagem"
              className="group relative size-20 overflow-hidden rounded-md border bg-secondary"
            >
              <span className="absolute inset-0 transition-transform duration-200 group-hover:scale-110">
                <img
                  src={miniatura}
                  alt=""
                  className="size-full object-cover"
                  style={{ transform: `translate(${imagem.imagem_x}%, ${imagem.imagem_y}%) scale(${imagem.imagem_zoom})` }}
                />
              </span>
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Pencil className="size-5 text-white" />
              </span>
            </button>
          );
        })}
      </div>

      {aberta ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAberta(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="editar-imagem-titulo"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-card p-4 text-card-foreground shadow-lg ring-1 ring-foreground/10"
            onClick={(evento) => evento.stopPropagation()}
          >
            <h2 id="editar-imagem-titulo" className="text-base font-medium">
              Editar imagem
            </h2>
            <ActionForm
              key={aberta.id}
              action={salvarImagemProduto}
              className="mt-4 space-y-3"
              onSuccess={() => setAberta(null)}
            >
              <input type="hidden" name="id" value={aberta.id} />
              <input type="hidden" name="produto_id" value={produtoId} />
              <EnquadramentoImagem url={url} zoomInicial={aberta.imagem_zoom} xInicial={aberta.imagem_x} yInicial={aberta.imagem_y} />
              <div className="flex flex-wrap items-center gap-2">
                <SubmitButton size="sm">Salvar</SubmitButton>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAberta(null)}>
                  Cancelar
                </Button>
              </div>
            </ActionForm>
            <ActionForm action={excluirImagemProduto} className="mt-2" onSuccess={() => setAberta(null)}>
              <input type="hidden" name="id" value={aberta.id} />
              <input type="hidden" name="produto_id" value={produtoId} />
              <SubmitButton variant="destructive" size="sm">
                Remover
              </SubmitButton>
            </ActionForm>
          </div>
        </div>
      ) : null}
    </>
  );
}
