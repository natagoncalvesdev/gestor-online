import Link from "next/link";
import type { PassoTrilha } from "@/lib/trilha";

export function ItensTrilha({
  passos,
  atual,
  denso = false,
}: {
  passos: PassoTrilha[];
  atual?: { tipo: PassoTrilha["tipo"]; id: string };
  denso?: boolean;
}) {
  if (passos.length === 0) {
    return <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum conteúdo publicado ainda.</p>;
  }

  return (
    <ul>
      {passos.map((passo) => {
        const marcado = atual?.tipo === passo.tipo && atual.id === passo.id;
        if (passo.tipo === "secao") {
          return (
            <li key={passo.chave} className="border-t bg-secondary/70 px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground first:border-t-0">
              {passo.titulo}
            </li>
          );
        }
        const classe = [
          "flex items-start gap-2 border-t py-2.5 first:border-t-0",
          denso ? "px-3" : "px-4",
          passo.nivel === 1 ? "pl-8" : "",
          marcado ? "bg-primary/10" : "hover:bg-secondary/60",
          passo.aberta ? "" : "opacity-70",
        ]
          .filter(Boolean)
          .join(" ");
        const miolo = (
          <>
            <span
              className={
                passo.concluida
                  ? "mt-0.5 size-4 shrink-0 rounded-full border-2 border-primary bg-primary"
                  : "mt-0.5 size-4 shrink-0 rounded-full border-2 border-muted-foreground/40"
              }
            />
            <span className="min-w-0">
              <span className={marcado ? "font-medium" : passo.aberta ? "text-primary" : ""}>{passo.titulo}</span>
              {passo.quando ? <span className="mt-0.5 block text-xs text-muted-foreground">{passo.quando}</span> : null}
            </span>
          </>
        );
        return (
          <li key={passo.chave}>
            {passo.aberta && passo.href ? (
              <Link href={passo.href} className={classe}>
                {miolo}
              </Link>
            ) : (
              <div className={classe}>{miolo}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
