import Link from "next/link";
import { notFound } from "next/navigation";
import { licaoLiberada, textoLiberacao } from "@/lib/ebd";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireAluno } from "@/lib/session";

export default async function EscolaDominicalPage({ params }: { params: Promise<{ matriculaId: string }> }) {
  const session = await requireAluno();
  const { matriculaId } = await params;
  const admin = createServiceRoleClient();
  if (!admin) notFound();
  const { data: matricula } = await admin
    .from("matricula")
    .select("id, produto:produto_id(id, nome, escola_dominical)")
    .eq("id", matriculaId)
    .eq("aluno_id", session.user.id)
    .neq("status", "cancelada")
    .maybeSingle();
  const produto = Array.isArray(matricula?.produto) ? matricula?.produto[0] : matricula?.produto;
  if (!matricula || !produto?.escola_dominical) notFound();
  const { data: licoes } = await admin
    .from("ebd_licao")
    .select("id, ordem, titulo, libera_em")
    .eq("produto_id", produto.id)
    .order("ordem");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-primary">{produto.nome}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Cada lição abre na data marcada.</p>
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
                <Link href={`/meus-cursos/${matriculaId}/ebd/${licao.id}`} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-3 hover:bg-secondary">
                  {conteudo}
                </Link>
              ) : (
                <div className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-3 opacity-70">{conteudo}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
