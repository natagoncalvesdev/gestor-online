import Link from "next/link";
import { notFound } from "next/navigation";
import { licaoLiberada, textoLiberacao } from "@/lib/ebd";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireAluno } from "@/lib/session";

type AulaLinha = { id: string; ordem: number; titulo: string; libera_em: string | null; topico_id: string | null; posicao: number | null };
type TopicoLinha = { id: string; titulo: string; ordem: number; posicao: number | null };

export default async function MateriaAbertaPage({ params }: { params: Promise<{ materiaId: string }> }) {
  await requireAluno();
  const { materiaId } = await params;
  const admin = createServiceRoleClient();
  if (!admin) notFound();
  const { data: materia } = await admin.from("materia").select("id, nome, gratuita").eq("id", materiaId).eq("para_todos", true).eq("ativo", true).maybeSingle();
  if (!materia) notFound();
  const [{ data: aulas }, { data: topicos }, { data: licoes }] = await Promise.all([
    admin.from("aula").select("id, ordem, titulo, libera_em, topico_id, posicao").eq("materia_id", materia.id).order("posicao"),
    admin.from("aula_topico").select("id, titulo, ordem, posicao").eq("materia_id", materia.id).order("posicao"),
    admin.from("ebd_licao").select("id, ordem, titulo, libera_em").eq("materia_id", materia.id).order("ordem"),
  ]);

  const listaAulas = (aulas ?? []) as AulaLinha[];
  const listaTopicos = (topicos ?? []) as TopicoLinha[];
  const sequencia = [
    ...listaTopicos.map((topico) => ({ tipo: "topico" as const, posicao: Number(topico.posicao ?? topico.ordem), topico })),
    ...listaAulas.map((aula) => ({ tipo: "aula" as const, posicao: Number(aula.posicao ?? aula.ordem), aula })),
  ].sort((a, b) => a.posicao - b.posicao);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-primary">{materia.nome}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {materia.gratuita ? "Material gratuito para todos os alunos." : "Disponível para todos os alunos."} O que ainda não chegou na data marcada fica bloqueado.
      </p>

      {sequencia.length > 0 ? (
        <ul className="mt-6 overflow-hidden rounded-xl border bg-card">
          {sequencia.map((item) =>
            item.tipo === "topico" ? (
              <li key={item.topico.id} className="border-t bg-secondary/60 px-4 py-2 text-sm font-semibold first:border-t-0">
                {item.topico.titulo}
              </li>
            ) : (
              <LinhaAula key={item.aula.id} aula={item.aula} />
            )
          )}
        </ul>
      ) : null}

      {(licoes ?? []).length > 0 ? (
        <ul className="mt-6 divide-y rounded-xl border bg-card">
          {(licoes ?? []).map((licao) => {
            const aberta = licaoLiberada(licao.libera_em);
            const conteudo = (
              <>
                <span className="text-sm text-muted-foreground">{licao.ordem}</span>
                <span className="font-medium">{licao.titulo}</span>
                <span className="text-sm text-muted-foreground">{aberta ? "Disponível" : textoLiberacao(licao.libera_em)}</span>
              </>
            );
            return (
              <li key={licao.id}>
                {aberta ? (
                  <Link href={`/meus-cursos/aberto/${materia.id}/${licao.id}`} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-3 hover:bg-secondary">
                    {conteudo}
                  </Link>
                ) : (
                  <div className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-3 opacity-70">{conteudo}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {sequencia.length === 0 && (licoes ?? []).length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Nenhuma aula publicada ainda.</p>
      ) : null}
    </div>
  );
}

function LinhaAula({ aula }: { aula: AulaLinha }) {
  const liberada = !aula.libera_em || licaoLiberada(aula.libera_em);
  if (!liberada) {
    return (
      <li className="flex items-center gap-3 border-t px-4 py-3 opacity-70 first:border-t-0">
        <span className="size-5 shrink-0 rounded-full border-2 border-muted-foreground/40" />
        <span>{aula.ordem} – {aula.titulo}</span>
        <span className="ml-auto text-sm text-muted-foreground">{textoLiberacao(aula.libera_em)}</span>
      </li>
    );
  }
  return (
    <li className="border-t first:border-t-0">
      <Link href={`/aula/${aula.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary">
        <span className="size-5 shrink-0 rounded-full border-2 border-muted-foreground/40" />
        <span className="text-primary underline-offset-2 hover:underline">{aula.ordem} – {aula.titulo}</span>
      </Link>
    </li>
  );
}
