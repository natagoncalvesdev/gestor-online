"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/field";

export function EnquadramentoImagem({
  url,
  zoomInicial,
  xInicial,
  yInicial,
  proporcao = "aspect-square",
  dica = "Arraste a imagem para posicionar e use o zoom. Salve para gravar este enquadramento.",
}: {
  url: string | null;
  zoomInicial: number;
  xInicial: number;
  yInicial: number;
  proporcao?: string;
  dica?: string;
}) {
  const [zoom, setZoom] = useState(zoomInicial);
  const [x, setX] = useState(xInicial);
  const [y, setY] = useState(yInicial);
  const [local, setLocal] = useState<string | null>(null);
  const arraste = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const src = local || url;

  function limitar(valor: number) {
    return Math.min(80, Math.max(-80, Math.round(valor * 10) / 10));
  }

  return (
    <div className="space-y-3">
      <Input
        name="imagem"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(evento) => {
          const arquivo = evento.target.files?.[0];
          if (!arquivo) return;
          setLocal(URL.createObjectURL(arquivo));
          setZoom(1);
          setX(0);
          setY(0);
        }}
      />
      <input type="hidden" name="imagem_zoom" value={zoom} />
      <input type="hidden" name="imagem_x" value={x} />
      <input type="hidden" name="imagem_y" value={y} />
      {src ? (
        <>
          <div
            className={`relative max-w-3xl cursor-grab overflow-hidden rounded-md border bg-secondary active:cursor-grabbing ${proporcao}`}
            onPointerDown={(evento) => {
              arraste.current = { px: evento.clientX, py: evento.clientY, x, y };
              evento.currentTarget.setPointerCapture(evento.pointerId);
            }}
            onPointerMove={(evento) => {
              if (!arraste.current) return;
              const largura = evento.currentTarget.clientWidth || 1;
              const altura = evento.currentTarget.clientHeight || 1;
              setX(limitar(arraste.current.x + ((evento.clientX - arraste.current.px) / largura) * 100));
              setY(limitar(arraste.current.y + ((evento.clientY - arraste.current.py) / altura) * 100));
            }}
            onPointerUp={() => {
              arraste.current = null;
            }}
          >
            <img
              src={src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              style={{ transform: `translate(${x}%, ${y}%) scale(${zoom})`, transformOrigin: "center" }}
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="h-8 rounded-md border bg-white px-3 text-sm" onClick={() => setZoom((valor) => Math.max(1, Math.round((valor - 0.1) * 10) / 10))}>
              Diminuir
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              aria-label="Zoom da imagem"
              className="w-full accent-primary"
              onChange={(evento) => setZoom(Number(evento.target.value))}
            />
            <button type="button" className="h-8 rounded-md border bg-white px-3 text-sm" onClick={() => setZoom((valor) => Math.min(3, Math.round((valor + 0.1) * 10) / 10))}>
              Aumentar
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{dica}</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Envie uma imagem para ajustar o enquadramento.</p>
      )}
    </div>
  );
}
