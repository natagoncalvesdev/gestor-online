import { CapaProduto } from "@/components/loja/capa-produto";
import { ItensTrilha } from "@/components/estudo/itens-trilha";
import { formatDate } from "@/lib/format";
import type { PassoTrilha } from "@/lib/trilha";
import { resumoProgresso } from "@/lib/trilha";

export function InicioMateriaAluno({
  nome,
  capa,
  zoom = 1,
  x = 0,
  y = 0,
  expiracao,
  passos,
}: {
  nome: string;
  capa: string | null;
  zoom?: number;
  x?: number;
  y?: number;
  expiracao: string | null;
  passos: PassoTrilha[];
}) {
  const { feitas, total, percentual } = resumoProgresso(passos);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {capa ? (
        <CapaProduto
          src={capa}
          zoom={zoom}
          x={x}
          y={y}
          proporcao="aspect-square w-full max-w-sm"
          className="mx-auto rounded-xl border"
        />
      ) : null}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-primary">{nome}</h1>
        {expiracao ? <p className="mt-2 text-sm text-muted-foreground">Válido até {formatDate(expiracao)}</p> : null}
        <div className="mt-4 flex items-center justify-between gap-4 text-[11px] font-semibold tracking-wide text-muted-foreground">
          <span>PROGRESSO NA MATÉRIA {percentual}%</span>
          <span>
            {feitas}/{total} PASSOS
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: `${percentual}%` }} />
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card">
        <h2 className="px-4 pt-4 font-medium">Aulas e conteúdo</h2>
        <ItensTrilha passos={passos} />
      </section>
    </div>
  );
}