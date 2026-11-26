import { jsPDF } from "jspdf";

const FONTE_URL = "/fonts/DejaVuSans.ttf";
const FONTE_ARQUIVO = "DejaVuSans.ttf";

export const FONTE_PROVA = "DejaVuSans";

let fonteBase64: Promise<string> | null = null;

function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      const resultado = typeof leitor.result === "string" ? leitor.result : "";
      const base64 = resultado.slice(resultado.indexOf(",") + 1);
      if (!base64) reject(new Error("Fonte da prova inválida."));
      else resolve(base64);
    };
    leitor.onerror = () => reject(leitor.error ?? new Error("Falha ao ler a fonte da prova."));
    leitor.readAsDataURL(blob);
  });
}

function carregarFonteBase64(): Promise<string> {
  if (!fonteBase64) {
    fonteBase64 = fetch(FONTE_URL)
      .then(async (resposta) => {
        if (!resposta.ok) throw new Error("Não foi possível carregar a fonte da prova.");
        return blobParaBase64(await resposta.blob());
      })
      .catch((erro: unknown) => {
        fonteBase64 = null;
        throw erro;
      });
  }
  return fonteBase64;
}

export async function registrarFonteProva(doc: jsPDF): Promise<void> {
  const base64 = await carregarFonteBase64();
  doc.addFileToVFS(FONTE_ARQUIVO, base64);
  doc.addFont(FONTE_ARQUIVO, FONTE_PROVA, "normal", undefined, "Identity-H");
}
