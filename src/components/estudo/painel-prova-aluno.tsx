import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import type { PainelProvaMateria } from "@/lib/prova-painel";

function textoNota(nota: number) {
  return nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function PainelProvaAluno({ painel }: { painel: PainelProvaMateria }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <h2 className="px-4 pt-4 font-medium">Prova</h2>
      <p className="px-4 pt-1 text-sm text-muted-foreground">{painel.titulo}</p>
      <ul className="mt-3">
        {painel.hrefContinuar ? (
          <li className="border-t">
            <Link href={painel.hrefContinuar} className="flex items-start gap-2 px-4 py-3 hover:bg-secondary/60">
              <span className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-amber-500 bg-amber-400" />
              <span>
                <span className="font-medium text-primary">Continuar prova</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Há uma prova em andamento.</span>
              </span>
            </Link>
          </li>
        ) : null}
        {painel.hrefNova ? (
          <li className="border-t">
            <Link href={painel.hrefNova} className="flex items-start gap-2 px-4 py-3 hover:bg-secondary/60">
              <span className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-primary" />
              <span>
                <span className="font-medium text-primary">
                  {painel.tentativas.length === 0 ? "Iniciar prova" : "Iniciar nova tentativa"}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {painel.tentativas.length === 0
                    ? "O tempo começa quando a prova iniciar."
                    : "A secretaria liberou uma nova prova."}
                </span>
              </span>
            </Link>
          </li>
        ) : null}
        {painel.tentativas.map((item, indice) => {
          const miolo = (
            <>
              <span className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-primary bg-primary" />
              <span className="min-w-0">
                <span className={item.href ? "text-primary" : ""}>
                  Tentativa {indice + 1}
                  {item.codigo ? ` · ${item.codigo}` : ""}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Nota {textoNota(item.nota)} · {item.acertos} de {item.total} acertos
                  {item.aprovado ? " · Aprovado" : " · Reprovado"}
                  {item.entregueEm ? ` · ${formatDateTime(item.entregueEm)}` : ""}
                </span>
              </span>
            </>
          );
          return (
            <li key={item.id} className="border-t">
              {item.href ? (
                <Link href={item.href} className="flex items-start gap-2 px-4 py-3 hover:bg-secondary/60">
                  {miolo}
                </Link>
              ) : (
                <div className="flex items-start gap-2 px-4 py-3 opacity-70">{miolo}</div>
              )}
            </li>
          );
        })}
        {!painel.hrefNova && !painel.hrefContinuar && painel.tentativas.length === 0 ? (
          <li className="border-t px-4 py-3 text-sm text-muted-foreground">Nenhuma tentativa de prova ainda.</li>
        ) : null}
      </ul>
    </section>
  );
}
