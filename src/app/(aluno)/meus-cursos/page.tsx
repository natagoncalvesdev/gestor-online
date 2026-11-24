import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";
import { PageTitle } from "@/components/page-title";
import { CapaProduto } from "@/components/loja/capa-produto";
import { urlImagemProduto } from "@/lib/produto-imagem";
import { lista, um } from "@/lib/relacao";

export default async function MeusCursosPage() {
  const session = await requireAluno();
  const supabase = await createClient();
  const { data } = await supabase
    .from("matricula")
    .select("id, status, produto:produto_id(nome, imagem_path, imagem_zoom, imagem_x, imagem_y), materias:matricula_materia(ordem, status, materia_id)")
    .eq("aluno_id", session.user.id)
    .neq("status", "cancelada")
    .order("data_criacao", { ascending: false });

  const matriculas = data ?? [];

  return (
    <div>
      <PageTitle title="Meus cursos" description="Os produtos liberados para a sua conta." />
      {matriculas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum produto liberado ainda. <Link href="/loja">Ver a loja</Link>.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {matriculas.map((matricula) => {
            const produto = um(
              matricula.produto as
                | { nome: string; imagem_path: string | null; imagem_zoom: number; imagem_x: number; imagem_y: number }
                | { nome: string; imagem_path: string | null; imagem_zoom: number; imagem_x: number; imagem_y: number }[]
                | null
            );
            const materias = lista(
              matricula.materias as { ordem: number; status: "bloqueada" | "liberada" | "concluida"; materia_id: string }[]
            ).sort((a, b) => a.ordem - b.ordem);
            const aberta = materias.find((linha) => linha.status !== "bloqueada") ?? materias[0];
            const href = aberta ? `/meus-cursos/${matricula.id}/${aberta.materia_id}` : null;
            const capa = urlImagemProduto(produto?.imagem_path);
            const cartao = (
              <>
                {capa ? (
                  <CapaProduto src={capa} zoom={Number(produto?.imagem_zoom ?? 1)} x={Number(produto?.imagem_x ?? 0)} y={Number(produto?.imagem_y ?? 0)} />
                ) : (
                  <div className="aspect-square w-full bg-secondary" />
                )}
                <div className="p-4">
                  <p className="font-semibold">{produto?.nome ?? "Produto"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {materias.length === 0 ? "Sem matérias" : `${materias.length} ${materias.length === 1 ? "matéria" : "matérias"}`}
                  </p>
                </div>
              </>
            );
            return href ? (
              <Link key={matricula.id} href={href} className="overflow-hidden rounded-xl border bg-card hover:border-primary">
                {cartao}
              </Link>
            ) : (
              <article key={matricula.id} className="overflow-hidden rounded-xl border bg-card">
                {cartao}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
