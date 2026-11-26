import { cn } from "@/lib/utils";

export type QuestaoVisualizacao = {
  id: string;
  enunciado: string;
  ordem: number;
  alternativas: { id: string; texto: string; ordem: number }[];
};

export function ProvaVisualizacao({
  questoes,
  escolhas,
  corretas,
}: {
  questoes: QuestaoVisualizacao[];
  escolhas: Record<string, string>;
  corretas: string[];
}) {
  const gabarito = new Set(corretas);
  return (
    <div className="flex min-w-0 flex-col gap-5">
      {questoes.map((questao, indice) => (
        <section key={questao.id} className="min-w-0 space-y-3 overflow-hidden rounded-xl border bg-card p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Questão {indice + 1}</p>
          <p className="text-base leading-relaxed break-words whitespace-pre-wrap">{questao.enunciado}</p>
          <div className="flex flex-col gap-2">
            {[...questao.alternativas]
              .sort((a, b) => a.ordem - b.ordem)
              .map((alternativa) => {
                const marcada = escolhas[questao.id] === alternativa.id;
                const correta = gabarito.has(alternativa.id);
                return (
                  <div
                    key={alternativa.id}
                    className={cn(
                      "flex min-w-0 items-start gap-3 rounded-lg border bg-background px-3 py-3 text-sm leading-relaxed",
                      correta && "border-emerald-600 bg-emerald-50",
                      marcada && !correta && "border-red-600 bg-red-50 text-red-700",
                    )}
                  >
                    <span className="min-w-0 break-words">
                      {alternativa.texto}
                      {correta ? " · correta" : ""}
                      {marcada && !correta ? " · errada" : ""}
                    </span>
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
