import Link from "next/link";
import { notFound } from "next/navigation";
import { Apresentacao } from "@/components/loja/apresentacao";
import { ItensTrilha } from "@/components/estudo/itens-trilha";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
import { CapaProduto } from "@/components/loja/capa-produto";
import { urlImagemProduto } from "@/lib/produto-imagem";
import { um } from "@/lib/relacao";
import { carregarTrilha, proximoPasso, resumoProgresso } from "@/lib/trilha";

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

  const passos = await carregarTrilha(supabase, materiaId, session.user.id, `?matricula=${matriculaId}`);
  const { feitas, total, percentual } = resumoProgresso(passos);
  const proxima = proximoPasso(passos);
  const capa = urlImagemProduto(produto?.imagem_path);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-primary">{produto?.nome ?? materia?.nome}</h1>
        <div className="mt-4 flex items-center justify-between gap-4 text-[11px] font-semibold tracking-wide text-muted-foreground">
          <span>PROGRESSO NO CURSO {percentual}%</span>
          <span>
            {feitas}/{total} PASSOS
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
          proporcao="aspect-square w-full max-w-xs"
          className="mx-auto rounded-md border"
        />
      ) : null}
      {produto?.apresentacao ? <Apresentacao html={produto.apresentacao} /> : null}

      {proxima?.href ? (
        <div className="text-center">
          <Link href={proxima.href} className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground">
            Continuar
          </Link>
        </div>
      ) : total > 0 ? (
        <p className="text-center text-sm text-muted-foreground">Você já concluiu os passos desta matéria.</p>
      ) : null}

      <section className="overflow-hidden rounded-xl border bg-card">
        <h2 className="px-4 pt-4 font-medium">Conteúdo</h2>
        <ItensTrilha passos={passos} />
      </section>
    </div>
  );
}
