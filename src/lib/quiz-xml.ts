export type QuestaoXml = {
  numero: number;
  enunciado: string;
  alternativas: { texto: string; correta: boolean }[];
};

export type QuizXml = {
  titulo: string;
  questoes: QuestaoXml[];
};

const LIMITE_QUESTOES = 400;

export function lerQuizXml(xml: string): { quiz: QuizXml } | { error: string } {
  const conteudo = xml.replace(/^\uFEFF/, "").trim();
  if (!conteudo.includes("<questions") || !conteudo.includes("<questionText")) {
    return { error: "Este XML não é uma prova com enunciado e alternativas." };
  }

  const bloco = conteudo.match(/<questions\b[^>]*>([\s\S]*?)<\/questions>/i)?.[1];
  if (!bloco) return { error: "Nenhuma questão encontrada no arquivo." };

  const questoes: QuestaoXml[] = [];
  const pedacos = bloco.split(/<question\b[^>]*>/i).slice(1);
  for (let indice = 0; indice < pedacos.length; indice += 1) {
    const corpo = pedacos[indice].split(/<\/question>/i)[0] ?? "";
    const numeroInformado = Number(textoLimpo(conteudoTag(corpo, "title")));
    const numero = Number.isInteger(numeroInformado) && numeroInformado > 0 ? numeroInformado : indice + 1;
    const enunciado = textoLimpo(conteudoTag(corpo, "questionText"));
    if (!enunciado) return { error: `A questão ${numero} está sem enunciado.` };

    const alternativas = alternativasDe(corpo);
    if (alternativas.length < 2) return { error: `A questão ${numero} precisa de verdadeiro e falso.` };
    const corretas = alternativas.filter((alternativa) => alternativa.correta).length;
    if (corretas !== 1) return { error: `A questão ${numero} precisa de uma única resposta correta.` };
    questoes.push({ numero, enunciado, alternativas });
    if (questoes.length > LIMITE_QUESTOES) {
      return { error: `O arquivo passa de ${LIMITE_QUESTOES} questões.` };
    }
  }

  if (questoes.length === 0) return { error: "Nenhuma questão encontrada no arquivo." };

  const antes = conteudo.split(/<questions\b/i)[0] ?? "";
  const titulo = textoLimpo(conteudoTag(antes, "title")) || "Prova";
  return { quiz: { titulo: titulo.slice(0, 200), questoes } };
}

function alternativasDe(bloco: string) {
  const respostas = bloco.match(/<answers\b[^>]*>([\s\S]*?)<\/answers>/i)?.[1] ?? "";
  const itens: { texto: string; correta: boolean }[] = [];
  const expressao = /<answer\b([^>]*)>([\s\S]*?)<\/answer>/gi;
  let encontrado: RegExpExecArray | null;
  while ((encontrado = expressao.exec(respostas))) {
    const texto = textoLimpo(conteudoTag(encontrado[2], "answerText"));
    if (!texto) continue;
    itens.push({ texto, correta: /\bcorrect\s*=\s*"true"/i.test(encontrado[1]) });
  }
  return itens;
}

function conteudoTag(bloco: string, tag: string) {
  const expressao = new RegExp(`<${tag}\\b[^>]*>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))\\s*</${tag}>`, "i");
  const encontrado = bloco.match(expressao);
  return (encontrado?.[1] ?? encontrado?.[2] ?? "").trim();
}

function textoLimpo(valor: string) {
  const semTags = valor.replace(/<br\s*\/?>/gi, " ").replace(/<\/p>/gi, " ").replace(/<[^>]+>/g, "");
  return decodeHtml(semTags).replace(/\s+/g, " ").trim();
}

function decodeHtml(valor: string) {
  return valor
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, codigo) => ponto(Number(codigo)))
    .replace(/&#x([0-9a-f]+);/gi, (_, codigo) => ponto(Number.parseInt(codigo, 16)));
}

function ponto(codigo: number) {
  return Number.isFinite(codigo) ? String.fromCodePoint(codigo) : "";
}
