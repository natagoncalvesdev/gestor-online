import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { Apresentacao } from "@/components/loja/apresentacao";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
import { CapaProduto } from "@/components/loja/capa-produto";
import { urlImagemProduto } from "@/lib/produto-imagem";
import { um } from "@/lib/relacao";

export default async function MateriaAlunoPage({
  params,
}: {
  params: Promise<{ matriculaId: string; materiaId: string }>;
}) {
  const { matriculaId, materiaId } = await params;
  const session = await requireAluno();
  const supabase = await createClient();
  const { data: matricula } = await supabase
    .from("matricula")
    .select("id, produto:produto_id(nome, slug, imagem_path, imagem_zoom, imagem_x, imagem_y, apresentacao)")
    .eq("id", matriculaId)
    .eq("aluno_id", session.user.id)
    .maybeSingle();
  if (!matricula) notFound();

  const { data: acesso } = await supabase
    .from("matricula_materia")
    .select("status, materia:materia_id(nome)")
    .eq("matricula_id", matriculaId)
    .eq("materia_id", materiaId)
    .maybeSingle();
  if (!acesso) notFound();

  const produto = um(
    matricula.produto as
      | { nome: string; slug: string; imagem_path: string | null; imagem_zoom: number; imagem_x: number; imagem_y: number; apresentacao: string }
      | { nome: string; slug: string; imagem_path: string | null; imagem_zoom: number; imagem_x: number; imagem_y: number; apresentacao: string }[]
      | null
  );
  const materia = um(acesso.materia as { nome: string } | { nome: string }[] | null);
  if (acesso.status === "bloqueada") {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold">{produto?.nome ?? materia?.nome}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Esta matéria ainda não foi liberada.</p>
      </div>
    );
  }

  const { data: aulas } = await supabase
    .from("aula")
    .select("id, titulo, ordem")
    .eq("materia_id", materiaId)
    .order("ordem");
  const ids = (aulas ?? []).map((aula) => aula.id);
  const { data: progresso } = ids.length
    ? await supabase.from("aula_progresso").select("aula_id, video_concluido").eq("aluno_id", session.user.id).in("aula_id", ids)
    : { data: [] };
  const vistas = new Set((progresso ?? []).filter((item) => item.video_concluido).map((item) => item.aula_id));
  const feitas = (aulas ?? []).filter((aula) => vistas.has(aula.id)).length;
  const total = aulas?.length ?? 0;
  const percentual = total === 0 ? 0 : Math.round((feitas / total) * 100);
  const proxima = (aulas ?? []).find((aula) => !vistas.has(aula.id)) ?? null;
  const capa = urlImagemProduto(produto?.imagem_path);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-primary">{produto?.nome ?? materia?.nome}</h1>
        <div className="mt-4 flex items-center justify-between gap-4 text-[11px] font-semibold tracking-wide text-muted-foreground">
          <span>PROGRESSO NO CURSO {percentual}%</span>
          <span>
            {feitas}/{total} LIÇÕES
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: `${percentual}%` }} />
        </div>
      </div>

      {capa ? (
        <CapaProduto
          src={capa}
          zoom={Number(produto?.imagem_zoom ?? 1)}
          x={Number(produto?.imagem_x ?? 0)}
          y={Number(produto?.imagem_y ?? 0)}
          className="rounded-md border"
        />
      ) : null}
      {produto?.apresentacao ? <Apresentacao html={produto.apresentacao} /> : null}

      {proxima ? (
        <div className="text-center">
          <Link href={`/aula/${proxima.id}?matricula=${matriculaId}`} className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
            Continuar
          </Link>
        </div>
      ) : total > 0 ? (
        <p className="text-center text-sm text-muted-foreground">Você já marcou todas as aulas como assistidas.</p>
      ) : null}

      <section className="rounded-xl border bg-card">
        <h2 className="px-4 pt-4 font-medium">Conteúdo</h2>
        <ul>
          {(aulas ?? []).map((aula) => {
            const vista = vistas.has(aula.id);
            return (
              <li key={aula.id} className="border-t">
                <Link href={`/aula/${aula.id}?matricula=${matriculaId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                  <span className={vista ? "size-5 shrink-0 rounded-full bg-primary" : "size-5 shrink-0 rounded-full border-2 border-muted-foreground/40"} />
                  <span className="text-primary underline-offset-2 hover:underline">
                    {aula.ordem} – {aula.titulo}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="font-medium">Prova final</h2>
        {acesso.status === "liberada" ? (
          <Link href={`/prova/${materiaId}`} className="mt-3 flex items-center gap-2 text-primary underline-offset-2 hover:underline">
            <Lock className="size-4" />
            Prova – {materia?.nome}
          </Link>
        ) : (
          <p className="mt-2 text-sm text-emerald-800">Matéria concluída.</p>
        )}
      </section>
    </div>
  );
}
