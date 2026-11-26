"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatDateTime } from "@/lib/format";

export type TentativaProvaInfo = {
  id?: string;
  href?: string;
  codigo: string | null;
  nota: number;
  acertos: number;
  total: number;
  aprovado: boolean;
  entregueEm: string | null;
};

function textoNota(nota: number) {
  return nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function NotaComTentativas({
  nota,
  tentativas,
  destaque = false,
}: {
  nota: string;
  tentativas: TentativaProvaInfo[];
  destaque?: boolean;
}) {
  const ancora = useRef<HTMLSpanElement>(null);
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState({ top: 0, left: 0 });
  const fecharTimer = useRef<number>(0);

  function abrir() {
    window.clearTimeout(fecharTimer.current);
    const el = ancora.current;
    if (el) {
      const caixa = el.getBoundingClientRect();
      setPosicao({ top: caixa.top, left: caixa.left });
    }
    setAberto(true);
  }

  function agendarFechar() {
    window.clearTimeout(fecharTimer.current);
    fecharTimer.current = window.setTimeout(() => setAberto(false), 120);
  }

  useEffect(() => () => window.clearTimeout(fecharTimer.current), []);

  if (tentativas.length === 0) {
    return destaque ? <span className="text-2xl font-semibold tabular-nums">{nota}</span> : <span>{nota}</span>;
  }

  const painel =
    aberto && typeof document !== "undefined"
      ? createPortal(
          <span
            role="tooltip"
            onMouseEnter={abrir}
            onMouseLeave={agendarFechar}
            className="fixed z-[80] w-72 -translate-y-full pb-2"
            style={{ top: posicao.top, left: posicao.left }}
          >
            <span className="mb-0 block rounded-xl border bg-white p-3 text-left text-sm shadow-lg">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tentativas de prova
              </span>
              <ul className="flex flex-col gap-2">
                {tentativas.map((item, indice) => {
                  const chave = item.id ?? `${item.codigo ?? "t"}-${item.entregueEm ?? indice}`;
                  const miolo = (
                    <>
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold tabular-nums">Nota {textoNota(item.nota)}</span>
                        <span className={item.aprovado ? "text-emerald-700" : "text-amber-800"}>
                          {item.aprovado ? "Aprovado" : "Reprovado"}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.acertos} de {item.total} acertos
                        {item.entregueEm ? ` · ${formatDateTime(item.entregueEm)}` : ""}
                      </span>
                      {item.codigo ? (
                        <span className="mt-0.5 block font-mono text-xs tracking-wider text-muted-foreground">
                          Código {item.codigo}
                        </span>
                      ) : null}
                    </>
                  );
                  return (
                    <li key={chave}>
                      {item.href ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-lg bg-secondary/60 px-2.5 py-2 hover:bg-secondary"
                        >
                          {miolo}
                        </a>
                      ) : (
                        <span className="block rounded-lg bg-secondary/60 px-2.5 py-2">{miolo}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </span>
          </span>,
          document.body,
        )
      : null;

  return (
    <span className="relative inline-flex" onMouseEnter={abrir} onMouseLeave={agendarFechar}>
      <span
        ref={ancora}
        tabIndex={0}
        onFocus={abrir}
        onBlur={agendarFechar}
        className={
          destaque
            ? "cursor-help text-2xl font-semibold tabular-nums underline decoration-dotted decoration-muted-foreground/70 underline-offset-4"
            : "cursor-help underline decoration-dotted decoration-muted-foreground/70 underline-offset-2"
        }
      >
        {nota}
      </span>
      {painel}
    </span>
  );
}
