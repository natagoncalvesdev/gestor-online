import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireInterno } from "@/lib/session";
import { PageTitle } from "@/components/page-title";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireInterno();
  const { q } = await searchParams;
  const termo = (q ?? "").replace(/[%_,]/g, "").trim();
  const supabase = await createClient();
  let consulta = supabase
    .from("aluno")
    .select("id, nome, email, cpf, numero_aluno, status")
    .order("nome")
    .limit(100);
  if (termo) {
    consulta = consulta.or(
      `nome.ilike.%${termo}%,email.ilike.%${termo}%,cpf.ilike.%${termo}%,numero_aluno.ilike.%${termo}%`
    );
  }
  const { data } = await consulta;

  return (
    <div>
      <PageTitle title="Alunos" description="Busque por nome, e-mail, CPF ou número do aluno." />
      <form className="mb-4 flex gap-2">
        <Input name="q" defaultValue={termo} placeholder="Buscar aluno" />
        <Button type="submit">Buscar</Button>
      </form>
      <ul className="divide-y rounded-xl border bg-card">
        {(data ?? []).map((aluno) => (
          <li key={aluno.id}>
            <Link href={`/secretaria/alunos/${aluno.id}`} className="block p-4 hover:bg-secondary">
              <p className="font-medium">{aluno.nome}</p>
              <p className="text-sm text-muted-foreground">
                {aluno.numero_aluno} · {aluno.email} · {aluno.cpf}
                {aluno.status === "inativo" ? " · Inativo" : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {(data ?? []).length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Nenhum aluno encontrado.</p> : null}
    </div>
  );
}
