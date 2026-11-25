import Link from "next/link";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { marcarAulaVista } from "@/actions/estudo";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import type { PassoTrilha } from "@/lib/trilha";

export function NavegacaoPasso({
  voltar,
  anterior,
  seguinte,
  concluir,
}: {
  voltar: string;
  anterior: PassoTrilha | null;
  seguinte: PassoTrilha | null;
  concluir?: { aulaId?: string; topicoId?: string; matriculaId: string | null; materiaId: string; visto: boolean };
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {anterior?.href ? (
        <Link href={anterior.href} className="inline-flex h-11 items-center justify-center gap-1 rounded-md border bg-white px-3 text-sm font-medium">
          <ChevronLeft className="size-4" /> {anterior.titulo}
        </Link>
      ) : (
        <Link href={voltar} className="inline-flex h-11 items-center justify-center gap-1 rounded-md border bg-white px-3 text-sm font-medium">
          <ChevronLeft className="size-4" /> Voltar para o curso
        </Link>
      )}
      {concluir ? (
        <ActionForm action={marcarAulaVista} className="sm:justify-self-center">
          {concluir.aulaId ? <input type="hidden" name="aula_id" value={concluir.aulaId} /> : null}
          {concluir.topicoId ? <input type="hidden" name="topico_id" value={concluir.topicoId} /> : null}
          <input type="hidden" name="matricula_id" value={concluir.matriculaId ?? ""} />
          <input type="hidden" name="materia_id" value={concluir.materiaId} />
          <SubmitButton pendingLabel="Salvando..." className="h-11 w-full">
            <Check className="size-4" /> {concluir.visto ? "Concluído" : "Marcar concluído"}
          </SubmitButton>
        </ActionForm>
      ) : (
        <span />
      )}
      {seguinte?.href ? (
        <Link href={seguinte.href} className="inline-flex h-11 items-center justify-center gap-1 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground">
          <span className="truncate">{seguinte.titulo}</span> <ChevronRight className="size-4 shrink-0" />
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
