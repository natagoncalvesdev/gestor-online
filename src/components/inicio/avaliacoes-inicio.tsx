"use client";

import { useState } from "react";

export type AvaliacaoInicio = {
  id: string;
  autor: string;
  texto: string;
  estrelas: number;
};

function Estrelas({ quantidade, grande = false }: { quantidade: number; grande?: boolean }) {
  return (
    <span className={`tracking-wide text-[#f4b400] ${grande ? "text-2xl" : "text-sm"}`} aria-label={`${quantidade} de 5 estrelas`}>
      {"★★★★★".slice(0, quantidade)}
      <span className="text-black/15">{"★★★★★".slice(quantidade)}</span>
    </span>
  );
}

export function AvaliacoesInicio({
  titulo,
  nota,
  resumo,
  link,
  avaliacoes,
}: {
  titulo: string;
  nota: number;
  resumo: string;
  link: string;
  avaliacoes: AvaliacaoInicio[];
}) {
  const [inicio, setInicio] = useState(0);
  const visiveis = 3;
  const fatia = avaliacoes.slice(inicio, inicio + visiveis);
  const lista = fatia.length === visiveis || avaliacoes.length <= visiveis ? fatia : [...fatia, ...avaliacoes.slice(0, visiveis - fatia.length)];

  return (
    <section className="bg-white px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-6xl text-center">
        <h2 className="text-2xl font-bold text-[#1f4b73] sm:text-3xl">{titulo}</h2>
        <p className="mt-4 text-5xl font-semibold text-[#1f4b73]">{nota.toFixed(1).replace(".", ",")}</p>
        <div className="mt-1">
          <Estrelas quantidade={Math.round(nota)} grande />
        </div>
        {resumo ? <p className="mt-2 text-sm text-muted-foreground">{resumo}</p> : null}

        {avaliacoes.length > 0 ? (
          <div className="relative mt-8">
            {avaliacoes.length > visiveis ? (
              <button
                type="button"
                aria-label="Avaliações anteriores"
                className="absolute top-1/2 left-0 z-10 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-white shadow sm:inline-flex sm:items-center sm:justify-center"
                onClick={() => setInicio((valor) => (valor - 1 + avaliacoes.length) % avaliacoes.length)}
              >
                ‹
              </button>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lista.map((item) => (
                <article key={item.id} className="rounded-xl border bg-white p-5 text-left shadow-sm">
                  <Estrelas quantidade={item.estrelas} />
                  <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-foreground/80">“{item.texto}”</p>
                  <p className="mt-4 text-sm font-semibold">{item.autor}</p>
                </article>
              ))}
            </div>
            {avaliacoes.length > visiveis ? (
              <button
                type="button"
                aria-label="Próximas avaliações"
                className="absolute top-1/2 right-0 z-10 hidden h-10 w-10 translate-x-1/2 -translate-y-1/2 rounded-full border bg-white shadow sm:inline-flex sm:items-center sm:justify-center"
                onClick={() => setInicio((valor) => (valor + 1) % avaliacoes.length)}
              >
                ›
              </button>
            ) : null}
          </div>
        ) : null}

        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex rounded-md bg-accent px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-accent-foreground hover:bg-accent/90"
          >
            Ver mais avaliações
          </a>
        ) : null}
      </div>
    </section>
  );
}
