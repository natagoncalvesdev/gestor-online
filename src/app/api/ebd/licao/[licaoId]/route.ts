import { arquivoLicao } from "@/lib/ebd-arquivo";

export async function GET(_request: Request, context: { params: Promise<{ licaoId: string }> }) {
  const { licaoId } = await context.params;
  return arquivoLicao(licaoId);
}
