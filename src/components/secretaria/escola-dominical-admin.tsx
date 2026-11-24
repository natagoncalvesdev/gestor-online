import { adicionarLicao, clonarLicao, excluirAnexoLicao, salvarAnexoLicao, salvarLicao } from "@/actions/ebd";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";

export type LicaoAdmin = {
  id: string;
  ordem: number;
  titulo: string;
  youtube_url: string;
  pdf_exibir_path: string;
  libera_em: string | null;
  anexos: { id: string; nome: string }[];
};

function campoData(iso: string | null) {
  if (!iso) return "";
  const partes = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return partes.replace(" ", "T");
}

export function EscolaDominicalAdmin({ materiaId, licoes }: { materiaId: string; licoes: LicaoAdmin[] }) {
  const lista = licoes.slice().sort((a, b) => a.ordem - b.ordem);
  if (lista.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lições para todos</CardTitle>
          <CardDescription>Salve a matéria com “Disponibilizar para todos” e adicione as lições.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lições</CardTitle>
        <CardDescription>
          Cada lição abre para qualquer aluno na data e hora de Brasília. O PDF da página é exibido no navegador. Os outros PDFs ficam para download.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ActionForm action={adicionarLicao}>
          <input type="hidden" name="materia_id" value={materiaId} />
          <SubmitButton size="sm">Nova lição</SubmitButton>
        </ActionForm>
        {lista.map((licao) => (
          <div key={licao.id} className="rounded-lg border p-4">
            <p className="text-sm font-semibold text-muted-foreground">Lição {licao.ordem}</p>
            <ActionForm action={salvarLicao} className="mt-3 grid gap-3">
              <input type="hidden" name="id" value={licao.id} />
              <input type="hidden" name="materia_id" value={materiaId} />
              <Field label="Título">
                <Input name="titulo" defaultValue={licao.titulo} required />
              </Field>
              <Field label="Link do YouTube">
                <Input name="youtube_url" defaultValue={licao.youtube_url} placeholder="https://www.youtube.com/watch?v=..." />
              </Field>
              <Field label="Disponível em (horário de Brasília)">
                <Input name="libera_em" type="datetime-local" defaultValue={campoData(licao.libera_em)} />
              </Field>
              <Field label={licao.pdf_exibir_path ? "Trocar o PDF exibido na página" : "PDF exibido na página"}>
                <Input name="pdf_exibir" type="file" accept="application/pdf" />
              </Field>
              <SubmitButton size="sm">Salvar lição</SubmitButton>
            </ActionForm>
            <ActionForm action={clonarLicao} className="mt-2">
              <input type="hidden" name="id" value={licao.id} />
              <input type="hidden" name="materia_id" value={materiaId} />
              <SubmitButton variant="outline" size="sm" pendingLabel="Clonando...">Clonar</SubmitButton>
            </ActionForm>
            <ul className="mt-4 space-y-2">
              {licao.anexos.map((anexo) => (
                <li key={anexo.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{anexo.nome}</span>
                  <ActionForm action={excluirAnexoLicao}>
                    <input type="hidden" name="id" value={anexo.id} />
                    <input type="hidden" name="materia_id" value={materiaId} />
                    <SubmitButton variant="ghost" size="sm">
                      Remover
                    </SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
            <ActionForm action={salvarAnexoLicao} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <input type="hidden" name="licao_id" value={licao.id} />
              <input type="hidden" name="materia_id" value={materiaId} />
              <Field label="Nome do PDF para download">
                <Input name="nome" placeholder="Revista do aluno" />
              </Field>
              <Field label="Arquivo">
                <Input name="arquivo" type="file" accept="application/pdf" />
              </Field>
              <SubmitButton size="sm">Adicionar PDF</SubmitButton>
            </ActionForm>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
