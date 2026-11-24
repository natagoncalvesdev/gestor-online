import { requireAluno } from "@/lib/session";

export default async function IndicacoesPage() {
  const session = await requireAluno();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">Indicações</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Compartilhe seu número de aluno. Quem se cadastrar pode informar esse número como indicação.
      </p>
      <p className="mt-6 text-3xl font-semibold tracking-tight text-primary">{session.user.numero_aluno}</p>
    </div>
  );
}
