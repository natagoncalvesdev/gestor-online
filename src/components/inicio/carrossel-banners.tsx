"use client";

import { useEffect, useState } from "react";
import { CapaProduto } from "@/components/loja/capa-produto";

export type BannerInicio = {
  id: string;
  src: string;
  zoom: number;
  x: number;
  y: number;
  link: string;
};

export function CarrosselBanners({ banners, compacto = false }: { banners: BannerInicio[]; compacto?: boolean }) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => {
      setIndice((atual) => (atual + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const passo = banners.length > 1 ? indice % banners.length : 0;
  const janela = Math.min(3, banners.length);
  const folga = `${(janela - 1) * 0.75}rem`;
  const largura = `calc((100% - ${folga}) / ${janela})`;
  const faixa = banners.length > 1 ? [...banners, ...banners].slice(0, banners.length + janela) : banners;

  return (
    <section className={compacto ? "bg-[#f7f4ef] px-4 py-3" : "bg-[#f7f4ef] px-4 py-6"}>
      <div className={`mx-auto overflow-hidden ${compacto ? "max-w-3xl" : "max-w-6xl"}`}>
        <div
          className="flex gap-3 transition-transform duration-500"
          style={{ transform: `translateX(calc(${passo} * -1 * (${largura} + 0.75rem)))` }}
        >
          {faixa.map((banner, posicao) => {
            const imagem = (
              <CapaProduto src={banner.src} zoom={banner.zoom} x={banner.x} y={banner.y} proporcao="aspect-[2/1] w-full" className="bg-primary" />
            );
            return (
              <div key={`${banner.id}-${posicao}`} className="shrink-0 overflow-hidden rounded-xl" style={{ width: largura }}>
                {banner.link ? <a href={banner.link} className="block">{imagem}</a> : imagem}
              </div>
            );
          })}
        </div>
      </div>
      {banners.length > 1 ? (
        <div className="mt-3 flex justify-center gap-1.5">
          {banners.map((banner, posicao) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`Banner ${posicao + 1}`}
              className={`h-2 w-2 rounded-full ${posicao === passo ? "bg-foreground/70" : "bg-foreground/25"}`}
              onClick={() => setIndice(posicao)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
