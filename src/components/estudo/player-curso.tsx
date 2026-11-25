import Link from "next/link";

export function PlayerCurso({
  produtoNome,
  voltar,
  titulo,
  children,
  rodape,
}: {
  produtoNome: string;
  voltar: string;
  titulo: string;
  children: React.ReactNode;
  rodape?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{titulo}</h1>
        <p className="mt-2 text-sm text-primary">
          <Link href={voltar} className="hover:underline">
            {produtoNome}
          </Link>
        </p>
      </div>
      {children}
      {rodape}
    </div>
  );
}
