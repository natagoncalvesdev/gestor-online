import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { Apresentacao } from "@/components/loja/apresentacao";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireAluno } from "@/lib/session";
import { CapaProduto } from "@/components/loja/capa-produto";
import { urlImagemProduto } from "@/lib/produto-imagem";
import { licaoLiberada, textoLiberacao } from "@/lib/ebd";
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

  const admin = createServiceRoleClient();
  const { count: questoes } = admin
    ? await admin.from("questao").select("id", { count: "exact", head: true }).eq("materia_id", materiaId)
    : { count: 0 };

  const [{ data: aulas }, { data: topicos }] = await Promise.all([
    supabase.from("aula").select("id, titulo, ordem, topico_id, libera_em, posicao").eq("materia_id", materiaId).order("posicao"),
    supabase.from("aula_topico").select("id, titulo, ordem, posicao").eq("materia_id", materiaId).order("posicao"),
  ]);
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
          {(topicos ?? []).map((topico) => {
            const doTopico = (aulas ?? []).filter((aula) => aula.topico_id === topico.id);
            if (doTopico.length === 0) return null;
            return (
              <li key={topico.id} className="border-t">
                <p className="bg-secondary/60 px-4 py-2 text-sm font-semibold">{topico.titulo}</p>
                <ul>
                  {doTopico.map((aula) => {
                    const vista = vistas.has(aula.id);
                    const liberada = !aula.libera_em || licaoLiberada(aula.libera_em);
                    return (
                      <li key={aula.id}>
                        {liberada ? (
                          <Link href={`/aula/${aula.id}?matricula=${matriculaId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                            <span className={vista ? "size-5 shrink-0 rounded-full bg-primary" : "size-5 shrink-0 rounded-full border-2 border-muted-foreground/40"} />
                            <span className="text-primary underline-offset-2 hover:underline">{aula.ordem} – {aula.titulo}</span>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-3 opacity-70">
                            <span className="size-5 shrink-0 rounded-full border-2 border-muted-foreground/40" />
                            <span>{aula.ordem} – {aula.titulo}</span>
                            <span className="ml-auto text-sm text-muted-foreground">{textoLiberacao(aula.libera_em)}</span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
          {(aulas ?? []).filter((aula) => !aula.topico_id).map((aula) => {
            const vista = vistas.has(aula.id);
            const liberada = !aula.libera_em || licaoLiberada(aula.libera_em);
            return (
              <li key={aula.id} className="border-t">
                {liberada ? (
                  <Link href={`/aula/${aula.id}?matricula=${matriculaId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60">
                    <span className={vista ? "size-5 shrink-0 rounded-full bg-primary" : "size-5 shrink-0 rounded-full border-2 border-muted-foreground/40"} />
                    <span className="text-primary underline-offset-2 hover:underline">{aula.ordem} – {aula.titulo}</span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 opacity-70">
                    <span className="size-5 shrink-0 rounded-full border-2 border-muted-foreground/40" />
                    <span>{aula.ordem} – {aula.titulo}</span>
                    <span className="ml-auto text-sm text-muted-foreground">{textoLiberacao(aula.libera_em)}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {(questoes ?? 0) > 0 ? (
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
      ) : null}
    </div>
  );
}
