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

export function CarrosselBanners({ banners }: { banners: BannerInicio[] }) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => {
      setIndice((atual) => (atual + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const atual = banners[indice] ?? banners[0];
  const imagem = (
    <CapaProduto src={atual.src} zoom={atual.zoom} x={atual.x} y={atual.y} proporcao="aspect-[2/1] w-full" className="bg-primary" />
  );

  return (
    <section className="bg-[#f7f4ef] px-4 py-6">
      <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-xl">
      {atual.link ? (
        <a href={atual.link} className="block">
          {imagem}
        </a>
      ) : (
        imagem
      )}
      {banners.length > 1 ? (
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
          {banners.map((banner, posicao) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`Banner ${posicao + 1}`}
              className={`h-2.5 w-2.5 rounded-full ${posicao === indice ? "bg-white" : "bg-white/45"}`}
              onClick={() => setIndice(posicao)}
            />
          ))}
        </div>
      ) : null}
      </div>
    </section>
  );
}
