export function PageTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function AvisoConfig() {
  return (
    <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
      O Supabase ainda não está configurado. Preencha o arquivo .env.local e execute a migração
      supabase/migrations/001_initial.sql.
    </p>
  );
}
