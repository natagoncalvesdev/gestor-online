import Link from "next/link";
import { notFound } from "next/navigation";
import { idYoutube, licaoLiberada, textoLiberacao } from "@/lib/ebd";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { requireAluno } from "@/lib/session";

export default async function LicaoEscolaPage({ params }: { params: Promise<{ matriculaId: string; licaoId: string }> }) {
  const session = await requireAluno();
  const { matriculaId, licaoId } = await params;
  const admin = createServiceRoleClient();
  if (!admin) notFound();
  const { data: matricula } = await admin
    .from("matricula")
    .select("id, produto_id")
    .eq("id", matriculaId)
    .eq("aluno_id", session.user.id)
    .neq("status", "cancelada")
    .maybeSingle();
  if (!matricula) notFound();
  const { data: licao } = await admin
    .from("ebd_licao")
    .select("id, ordem, titulo, youtube_url, pdf_exibir_path, libera_em, produto_id, anexos:ebd_anexo(id, nome)")
    .eq("id", licaoId)
    .eq("produto_id", matricula.produto_id)
    .maybeSingle();
  if (!licao) notFound();
  const aberta = licaoLiberada(licao.libera_em);
  const video = idYoutube(licao.youtube_url);
  const anexos = (licao.anexos ?? []) as { id: string; nome: string }[];

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/meus-cursos/${matriculaId}/ebd`} className="text-sm text-primary hover:underline">
        Voltar às lições
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        {licao.ordem}. {licao.titulo}
      </h1>
      {aberta ? (
        <div className="mt-6 space-y-6">
          {video ? (
            <div className="aspect-video overflow-hidden rounded-xl bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video}`}
                title={licao.titulo}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}
          {licao.pdf_exibir_path ? (
            <iframe title="Material da lição" src={`/api/ebd/licao/${licao.id}`} className="h-[75vh] w-full rounded-xl border bg-white" />
          ) : null}
          {anexos.length > 0 ? (
            <div>
              <h2 className="text-lg font-semibold">Arquivos para download</h2>
              <ul className="mt-3 space-y-2">
                {anexos.map((anexo) => (
                  <li key={anexo.id}>
                    <a href={`/api/ebd/anexo/${anexo.id}`} className="text-sm font-medium text-primary hover:underline">
                      {anexo.nome}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">Esta lição abre em {textoLiberacao(licao.libera_em)}.</p>
      )}
    </div>
  );
}
