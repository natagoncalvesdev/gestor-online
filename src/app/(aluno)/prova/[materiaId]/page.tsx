import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/session";

export default async function ProvaPage({
  params,
  searchParams,
}: {
  params: Promise<{ materiaId: string }>;
  searchParams: Promise<{ matricula?: string }>;
}) {
  const { materiaId } = await params;
  const { matricula } = await searchParams;
  await requireAluno();
  const supabase = await createClient();
  const { data } = await supabase
    .from("questionario")
    .select("id")
    .eq("materia_id", materiaId)
    .eq("encerra_materia", true)
    .order("posicao")
    .limit(1)
    .maybeSingle();
  const consulta = matricula ? `?matricula=${matricula}` : "";
  if (data) redirect(`/questionario/${data.id}${consulta}`);
  redirect(`/meus-cursos`);
}
