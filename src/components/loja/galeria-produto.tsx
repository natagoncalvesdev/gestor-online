"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ImagemGaleria = {
  id: string;
  url: string;
  zoom: number;
  x: number;
  y: number;
};

function ImagemPrincipal({
  imagem,
  aoAmpliar,
  emPromocao,
}: {
  imagem: ImagemGaleria;
  aoAmpliar: () => void;
  emPromocao: boolean;
}) {
  const [passou, setPassou] = useState(false);
  const [origem, setOrigem] = useState({ x: 50, y: 50 });
  const fator = passou ? Math.min(imagem.zoom * 2.4, 6) : imagem.zoom;

  function mover(evento: React.MouseEvent<HTMLDivElement>) {
    const caixa = evento.currentTarget.getBoundingClientRect();
    setOrigem({
      x: ((evento.clientX - caixa.left) / caixa.width) * 100,
      y: ((evento.clientY - caixa.top) / caixa.height) * 100,
    });
  }

  return (
    <div
      className="relative aspect-square overflow-hidden rounded-md border bg-secondary"
      onMouseEnter={() => setPassou(true)}
      onMouseLeave={() => setPassou(false)}
      onMouseMove={mover}
    >
      <img
        src={imagem.url}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover will-change-transform"
        style={{
          transform: `translate(${imagem.x}%, ${imagem.y}%) scale(${fator})`,
          transformOrigin: passou ? `${origem.x}% ${origem.y}%` : "center",
        }}
      />
      {emPromocao ? (
        <span className="pointer-events-none absolute left-0 top-0 z-10 rounded-br-md bg-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-foreground">
          Oferta!
        </span>
      ) : null}
      <button
        type="button"
        aria-label="Ampliar imagem"
        className="absolute right-2 top-2 z-10 flex size-9 items-center justify-center rounded-full border bg-white/95 shadow-sm"
        onClick={aoAmpliar}
      >
        <Search className="size-4 text-muted-foreground" />
      </button>
    </div>
  );
}

export function GaleriaProduto({ imagens, emPromocao }: { imagens: ImagemGaleria[]; emPromocao: boolean }) {
  const [ativa, setAtiva] = useState(0);
  const [ampliada, setAmpliada] = useState(false);
  const atual = imagens[ativa];

  if (!atual) {
    return <div className="aspect-square w-full max-w-[400px] rounded-md border bg-secondary" />;
  }

  return (
    <div className="w-full max-w-[400px]">
      <div className="relative pb-8">
        <ImagemPrincipal imagem={atual} emPromocao={emPromocao} aoAmpliar={() => setAmpliada(true)} />
        {imagens.length > 1 ? (
          <div className="absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2 translate-y-1/2 gap-2 rounded-md bg-white/90 p-1 shadow-md">
            {imagens.map((imagem, indice) => (
              <button
                key={imagem.id}
                type="button"
                aria-label={`Ver imagem ${indice + 1}`}
                className={
                  indice === ativa
                    ? "size-14 overflow-hidden rounded-sm border-2 border-primary ring-1 ring-primary/30"
                    : "size-14 overflow-hidden rounded-sm border opacity-90 hover:opacity-100"
                }
                onClick={() => setAtiva(indice)}
              >
                <img src={imagem.url} alt="" className="h-full w-full object-cover" draggable={false} />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {ampliada ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0" aria-label="Fechar" onClick={() => setAmpliada(false)} />
          <div className="relative z-10 w-full max-w-3xl">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="absolute -top-10 right-0 bg-white"
              onClick={() => setAmpliada(false)}
            >
              <X className="size-4" />
            </Button>
            <div className="relative mx-auto aspect-square max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-md bg-black">
              <img
                src={atual.url}
                alt=""
                className="absolute inset-0 h-full w-full object-contain"
                style={{ transform: `translate(${atual.x}%, ${atual.y}%) scale(${atual.zoom})`, transformOrigin: "center" }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}