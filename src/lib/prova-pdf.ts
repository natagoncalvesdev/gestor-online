import { jsPDF } from "jspdf";

import { FONTE_PROVA, registrarFonteProva } from "@/lib/prova-pdf-fonte";

export type ProvaPdfQuestao = {
  ordem: number;
  enunciado: string;
  alternativaEscolhidaId: string | null;
  alternativas: { id: string; texto: string; correta: boolean }[];
};

export type ProvaPdfDados = {
  materiaNome: string;
  alunoNome: string;
  numeroAluno: string | null;
  codigo: string | null;
  nota: number | null;
  acertos: number | null;
  quantidade: number;
  questoes: ProvaPdfQuestao[];
};

const COR_TITULO: [number, number, number] = [13, 88, 134];
const COR_TEXTO: [number, number, number] = [26, 32, 44];
const COR_SUAVE: [number, number, number] = [90, 98, 110];
const COR_ERRADO: [number, number, number] = [185, 28, 28];

const MARGEM = 16;
const LARGURA_PAGINA = 210;
const LIMITE_BASE = 289;
const GAP_COLUNA = 6;
const LARGURA_TEXTO = LARGURA_PAGINA - MARGEM * 2;
const LARGURA_COLUNA = (LARGURA_TEXTO - GAP_COLUNA) / 2;
const LOGO_ALTURA = 16;
const LOGO_LARGURA = 16;
const LOGO_URL = "/logo-online.png";
const FONTES = [11, 10.5, 10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5];
const INSTRUCAO = "Assinale a alternativa correta.";
const ESPACO_APOS_RESPOSTA = 3.6;

type AlternativaPdf = {
  texto: string;
  marcada: boolean;
  correta: boolean;
};

type Bloco = {
  enunciado: string[];
  alternativas: AlternativaPdf[];
  altura: number;
};

function dataEmissaoHoje() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

function nomeArquivo(materia: string, aluno: string) {
  const base = `${aluno}-${materia}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
  return `prova-${base || "cetadeb"}.pdf`;
}

function quebrar(doc: jsPDF, texto: string, largura: number): string[] {
  const linhas = doc.splitTextToSize(texto, largura) as string | string[];
  return Array.isArray(linhas) ? linhas : [linhas];
}

function corAlternativa(alt: AlternativaPdf): [number, number, number] {
  if (alt.marcada && !alt.correta) return COR_ERRADO;
  return COR_TEXTO;
}

function montarBloco(
  doc: jsPDF,
  ordem: number,
  enunciado: string,
  alternativas: AlternativaPdf[],
  fonte: number,
  lineH: number
): Bloco {
  doc.setFontSize(fonte);
  doc.setFont(FONTE_PROVA, "normal");
  const enunciadoLinhas = quebrar(doc, `${ordem} - ${enunciado}`, LARGURA_COLUNA);
  const altura = enunciadoLinhas.length * lineH + 0.4 + lineH + ESPACO_APOS_RESPOSTA;
  return { enunciado: enunciadoLinhas, alternativas, altura };
}

function desenharBloco(doc: jsPDF, bloco: Bloco, x: number, y: number, fonte: number, lineH: number): number {
  doc.setFontSize(fonte);
  doc.setFont(FONTE_PROVA, "normal");
  doc.setTextColor(...COR_TEXTO);
  for (const linha of bloco.enunciado) {
    doc.text(linha, x, y);
    y += lineH;
  }
  y += 0.4;

  const raio = Math.max(0.7, Math.min(1.35, fonte * 0.13));
  const recuo = raio * 2 + 1.6;
  let xAlt = x;
  doc.setLineWidth(0.25);
  for (const alt of bloco.alternativas) {
    const cor = corAlternativa(alt);
    doc.setDrawColor(...cor);
    doc.setFillColor(...cor);
    doc.setTextColor(...cor);
    doc.circle(xAlt + raio, y - raio * 0.85, raio, alt.marcada ? "FD" : "S");
    doc.text(alt.texto, xAlt + recuo, y);
    xAlt += recuo + doc.getTextWidth(alt.texto) + 4;
  }
  y += lineH + ESPACO_APOS_RESPOSTA;
  return y;
}

function cabeNaPagina(yInicio: number, esquerda: Bloco[], direita: Bloco[]) {
  const altura = Math.max(
    esquerda.reduce((soma, bloco) => soma + bloco.altura, 0),
    direita.reduce((soma, bloco) => soma + bloco.altura, 0)
  );
  return yInicio + altura - ESPACO_APOS_RESPOSTA <= LIMITE_BASE;
}

function desenharInstrucao(doc: jsPDF, y: number) {
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.setTextColor(...COR_TEXTO);
  doc.text(INSTRUCAO, MARGEM, y);
  return y + 6;
}

function desenharTimbre(doc: jsPDF, emitidoEm: string, logo: string | null) {
  const topo = 12;
  let xTexto = MARGEM;
  let base = topo;
  if (logo) {
    doc.addImage(logo, "PNG", MARGEM, topo, LOGO_LARGURA, LOGO_ALTURA);
    xTexto = MARGEM + LOGO_LARGURA + 3.5;
    base = topo + LOGO_ALTURA;
  }
  const largura = LARGURA_PAGINA - MARGEM - xTexto;
  const y = logo ? 16.5 : 18;

  doc.setTextColor(...COR_SUAVE);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Emissão: ${emitidoEm}`, LARGURA_PAGINA - MARGEM, y, { align: "right" });

  return { xTexto, largura, base, y };
}

function desenharCabecalho(doc: jsPDF, dados: ProvaPdfDados, emitidoEm: string, logo: string | null) {
  const numero = dados.numeroAluno?.trim() || "";
  const alunoLinha = numero ? `${numero} - ${dados.alunoNome}` : dados.alunoNome;
  const timbre = desenharTimbre(doc, emitidoEm, logo);
  let y = timbre.y;

  doc.setTextColor(...COR_TITULO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CETADEB", timbre.xTexto, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...COR_SUAVE);
  for (const linha of quebrar(doc, alunoLinha, timbre.largura)) {
    doc.text(linha, timbre.xTexto, y);
    y += 5;
  }

  y = Math.max(y + 2, timbre.base + 3);
  doc.setTextColor(...COR_TEXTO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const centro = LARGURA_PAGINA / 2;
  for (const linha of quebrar(doc, `Prova ${dados.materiaNome}`, LARGURA_TEXTO)) {
    doc.text(linha, centro, y, { align: "center" });
    y += 6;
  }

  if (dados.codigo) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...COR_TEXTO);
    doc.text(`Código ${dados.codigo}`, centro, y, { align: "center" });
    y += 6;
  }

  if (dados.nota != null) {
    const nota = dados.nota.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Nota ${nota} · ${dados.acertos ?? 0} de ${dados.quantidade} questões corretas`, centro, y, { align: "center" });
    y += 6;
  }

  y += 1;
  doc.setDrawColor(210, 214, 220);
  doc.setLineWidth(0.2);
  doc.line(MARGEM, y, LARGURA_PAGINA - MARGEM, y);
  return y + 5;
}

function alternativasDaQuestao(questao: ProvaPdfQuestao): AlternativaPdf[] {
  return questao.alternativas.map((alt) => ({
    texto: alt.texto,
    marcada: questao.alternativaEscolhidaId === alt.id,
    correta: alt.correta,
  }));
}

function desenharPagina(doc: jsPDF, dados: ProvaPdfDados, emitidoEm: string, logo: string | null) {
  const yInicio = desenharInstrucao(doc, desenharCabecalho(doc, dados, emitidoEm, logo));
  const meio = Math.ceil(dados.questoes.length / 2);
  let fonteEscolhida = FONTES[FONTES.length - 1]!;
  let lineH = fonteEscolhida * 0.45;
  let esquerda: Bloco[] = [];
  let direita: Bloco[] = [];

  for (const fonte of FONTES) {
    const alturaLinha = fonte * 0.45;
    const blocos = dados.questoes.map((questao) =>
      montarBloco(doc, questao.ordem, questao.enunciado, alternativasDaQuestao(questao), fonte, alturaLinha)
    );
    const colunaEsquerda = blocos.slice(0, meio);
    const colunaDireita = blocos.slice(meio);
    fonteEscolhida = fonte;
    lineH = alturaLinha;
    esquerda = colunaEsquerda;
    direita = colunaDireita;
    if (cabeNaPagina(yInicio, colunaEsquerda, colunaDireita)) break;
  }

  let y = yInicio;
  for (const bloco of esquerda) y = desenharBloco(doc, bloco, MARGEM, y, fonteEscolhida, lineH);
  y = yInicio;
  const xDireita = MARGEM + LARGURA_COLUNA + GAP_COLUNA;
  for (const bloco of direita) y = desenharBloco(doc, bloco, xDireita, y, fonteEscolhida, lineH);
}

async function carregarLogo(): Promise<string | null> {
  try {
    const resposta = await fetch(LOGO_URL);
    if (!resposta.ok) return null;
    const blob = await resposta.blob();
    return await new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(typeof leitor.result === "string" ? leitor.result : null);
      leitor.onerror = () => reject(leitor.error);
      leitor.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function baixarProvaPdf(dados: ProvaPdfDados) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const [logo] = await Promise.all([carregarLogo(), registrarFonteProva(doc)]);
  desenharPagina(doc, dados, dataEmissaoHoje(), logo);
  doc.save(nomeArquivo(dados.materiaNome, dados.alunoNome));
}
