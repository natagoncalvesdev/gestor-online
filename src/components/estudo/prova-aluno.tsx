"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Clock, Download, Timer } from "lucide-react";
import { toast } from "sonner";
import { iniciarProva, salvarRespostaProva, submeterQuestionario } from "@/actions/estudo";
import { NotaComTentativas, type TentativaProvaInfo } from "@/components/estudo/nota-tentativas";
import { Button } from "@/components/ui/button";
import { baixarProvaPdf } from "@/lib/prova-pdf";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type QuestaoProva = {
  id: string;
  enunciado: string;
  ordem: number;
  alternativas: { id: string; texto: string; ordem: number }[];
};

type Resultado = {
  nota: number;
  aprovado: boolean;
  acertos: number;
  total: number;
  mensagem: string;
  corretas: string[];
};

type SessaoInicial = {
  expiraEm: string;
  servidorAgora: string;
  respostas: { questao_id: string; alternativa_id: string }[];
};

function formatarDuracao(minutos: number) {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (resto === 0) return horas === 1 ? "1 hora" : `${horas} horas`;
  return `${horas} h ${resto} min`;
}

function formatarRelogio(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
}

export function ProvaAluno({
  materiaId,
  materiaNome,
  questionarioId,
  alunoNome,
  numeroAluno,
  notaMinima,
  comTempo,
  duracaoMinutos,
  codigo,
  sessaoInicial,
  resultadoInicial,
  tentativasIniciais,
  questoes: questoesIniciais,
}: {
  materiaId: string;
  materiaNome: string;
  questionarioId: string;
  alunoNome: string;
  numeroAluno: string | null;
  notaMinima: number | null;
  comTempo: boolean;
  duracaoMinutos: number;
  codigo: string | null;
  sessaoInicial: SessaoInicial | null;
  resultadoInicial: Resultado | null;
  tentativasIniciais: TentativaProvaInfo[];
  questoes: QuestaoProva[];
}) {
  const [codigoProva, setCodigoProva] = useState(codigo);
  const [questoes, setQuestoes] = useState(questoesIniciais);
  const [expiraEm, setExpiraEm] = useState(resultadoInicial ? null : sessaoInicial?.expiraEm ?? null);
  const [servidorAgora, setServidorAgora] = useState(resultadoInicial ? null : sessaoInicial?.servidorAgora ?? null);
  const [escolhas, setEscolhas] = useState<Record<string, string>>(() =>
    Object.fromEntries((sessaoInicial?.respostas ?? []).map((item) => [item.questao_id, item.alternativa_id]))
  );
  const [resultado, setResultado] = useState<Resultado | null>(resultadoInicial);
  const [tentativas, setTentativas] = useState(tentativasIniciais);
  const [restante, setRestante] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const encerrando = useRef(false);
  const escolhasRef = useRef(escolhas);
  const questoesRef = useRef(questoes);
  escolhasRef.current = escolhas;
  questoesRef.current = questoes;
  const corretas = new Set(resultado?.corretas ?? []);
  const encerrada = resultado != null;
  const iniciada = !comTempo || expiraEm != null || encerrada;
  const urgente = restante != null && restante <= 60_000;

  function montarRespostas() {
    return questoesRef.current
      .filter((questao) => escolhasRef.current[questao.id])
      .map((questao) => ({ questao_id: questao.id, alternativa_id: escolhasRef.current[questao.id] }));
  }

  function concluir(porTempo: boolean) {
    if (encerrando.current) return;
    const faltando = questoesRef.current.some((questao) => !escolhasRef.current[questao.id]);
    if (faltando && !porTempo) {
      toast.error("Responda todas as questões antes de enviar.");
      return;
    }
    encerrando.current = true;
    startTransition(async () => {
      const resposta = await submeterQuestionario({
        materiaId,
        questionarioId,
        respostas: montarRespostas(),
        porTempo,
      });
      if ("error" in resposta) {
        encerrando.current = false;
        if (!porTempo) toast.error(resposta.error);
      } else {
        setResultado(resposta.resultado);
        setTentativas((atual) => [
          {
            codigo: codigoProva,
            nota: resposta.resultado.nota,
            acertos: resposta.resultado.acertos,
            total: resposta.resultado.total,
            aprovado: resposta.resultado.aprovado,
            entregueEm: new Date().toISOString(),
          },
          ...atual,
        ]);
        toast.success(porTempo ? "O tempo acabou. A prova foi entregue." : resposta.resultado.mensagem);
      }
    });
  }

  useEffect(() => {
    if (!expiraEm || !servidorAgora || encerrada) return;
    const offset = new Date(servidorAgora).getTime() - Date.now();
    const fim = new Date(expiraEm).getTime();
    const tick = () => {
      const resta = fim - (Date.now() + offset);
      setRestante(resta);
      if (resta <= 0) concluir(true);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiraEm, servidorAgora, encerrada]);

  function iniciar() {
    startTransition(async () => {
      const resposta = await iniciarProva(questionarioId);
      if ("error" in resposta) toast.error(resposta.error);
      else if (resposta.concluida && resposta.resultado) {
        setExpiraEm(null);
        setServidorAgora(null);
        setCodigoProva(resposta.codigo);
        setQuestoes(resposta.questoes);
        setEscolhas(Object.fromEntries(resposta.respostas.map((item) => [item.questao_id, item.alternativa_id])));
        setResultado(resposta.resultado);
      } else {
        encerrando.current = false;
        setResultado(null);
        setRestante(null);
        setExpiraEm(resposta.expiraEm);
        setServidorAgora(resposta.servidorAgora);
        setCodigoProva(resposta.codigo);
        setQuestoes(resposta.questoes);
        setEscolhas(Object.fromEntries(resposta.respostas.map((item) => [item.questao_id, item.alternativa_id])));
      }
    });
  }

  function marcar(questaoId: string, alternativaId: string) {
    setEscolhas((atual) => ({ ...atual, [questaoId]: alternativaId }));
    if (!comTempo) return;
    void salvarRespostaProva(questionarioId, questaoId, alternativaId).then((resposta) => {
      if ("error" in resposta) toast.error(resposta.error);
    });
  }

  function baixarPdf() {
    if (!resultado) return;
    void baixarProvaPdf({
      materiaNome,
      alunoNome,
      numeroAluno,
      codigo: codigoProva,
      nota: resultado.nota,
      acertos: resultado.acertos,
      quantidade: resultado.total,
      questoes: questoes.map((questao, indice) => ({
        ordem: indice + 1,
        enunciado: questao.enunciado,
        alternativaEscolhidaId: escolhas[questao.id] ?? null,
        alternativas: [...questao.alternativas]
          .sort((a, b) => a.ordem - b.ordem)
          .map((alternativa) => ({
            id: alternativa.id,
            texto: alternativa.texto,
            correta: resultado.corretas.length > 0 ? corretas.has(alternativa.id) : escolhas[questao.id] === alternativa.id,
          })),
      })),
    }).catch(() => toast.error("Não foi possível gerar o PDF da prova."));
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {iniciada ? (
        <div className="flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-xl border bg-card px-4 py-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm text-muted-foreground">
              Nota mínima {notaMinima == null ? "—" : String(notaMinima)}
              {comTempo ? ` · ${formatarDuracao(duracaoMinutos)}` : ""}
            </p>
            {codigoProva ? <p className="font-mono text-sm tracking-[0.18em] text-foreground">Código {codigoProva}</p> : null}
          </div>
          {iniciada && !encerrada && restante != null ? (
            <p
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-lg font-semibold tabular-nums",
                urgente ? "bg-destructive/10 text-destructive" : "bg-secondary text-foreground",
              )}
              aria-live="polite"
            >
              <Timer className="size-4" />
              {formatarRelogio(restante)}
            </p>
          ) : null}
        </div>
      ) : null}

      {comTempo && !iniciada ? (
        <section className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-start gap-3 px-4 pt-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Clock className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-medium">Pronto para começar?</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Esta prova dura {formatarDuracao(duracaoMinutos)}. O tempo começa ao iniciar e segue mesmo se a página for fechada.
                {notaMinima != null ? ` Nota mínima ${notaMinima}.` : ""}
              </p>
            </div>
          </div>
          {tentativas.length > 0 ? (
            <ul className="mt-4 border-t">
              {tentativas.map((item, indice) => (
                <li key={`${item.codigo ?? "t"}-${indice}`} className="border-t px-4 py-3 first:border-t-0">
                  <p className="text-sm font-medium">
                    Tentativa {tentativas.length - indice}
                    {item.codigo ? ` · ${item.codigo}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Nota {item.nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · {item.acertos} de{" "}
                    {item.total} acertos · {item.aprovado ? "Aprovado" : "Reprovado"}
                    {item.entregueEm ? ` · ${formatDateTime(item.entregueEm)}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="border-t px-4 py-4">
            <Button type="button" className="h-11 px-6" disabled={pending} onClick={iniciar}>
              {pending ? "Iniciando..." : tentativas.length > 0 ? "Iniciar nova tentativa" : "Iniciar prova"}
            </Button>
          </div>
        </section>
      ) : null}

      {iniciada && questoes.length === 0 ? (
        <p className="rounded-xl border bg-card px-4 py-5 text-sm text-muted-foreground">O questionário ainda não tem questões.</p>
      ) : null}

      {iniciada
        ? questoes.map((questao, indice) => (
            <fieldset
              key={questao.id}
              disabled={encerrada || pending}
              className="min-w-0 w-full space-y-3 overflow-hidden rounded-xl border bg-card p-4 sm:p-5"
            >
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Questão {indice + 1}
              </legend>
              <p className="text-base leading-relaxed break-words whitespace-pre-wrap">{questao.enunciado}</p>
              <div className="flex flex-col gap-2">
                {[...questao.alternativas]
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((alternativa) => {
                    const marcada = escolhas[questao.id] === alternativa.id;
                    const correta = corretas.has(alternativa.id);
                    const mostraGabarito = encerrada && corretas.size > 0;
                    return (
                      <label
                        key={alternativa.id}
                        className={cn(
                          "flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border bg-background px-3 py-3 text-sm leading-relaxed",
                          !encerrada && marcada && "border-primary bg-primary/5",
                          mostraGabarito && correta && "border-emerald-600 bg-emerald-50",
                          mostraGabarito && marcada && !correta && "border-red-600 bg-red-50 text-red-700",
                          encerrada && "cursor-default",
                        )}
                      >
                        <input
                          type="radio"
                          name={questao.id}
                          className="mt-1 shrink-0"
                          checked={marcada}
                          disabled={encerrada}
                          onChange={() => marcar(questao.id, alternativa.id)}
                        />
                        <span className="min-w-0 break-words">
                          {alternativa.texto}
                          {mostraGabarito && correta ? " · correta" : ""}
                          {mostraGabarito && marcada && !correta ? " · errada" : ""}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </fieldset>
          ))
        : null}

      {encerrada ? (
        <section className="overflow-hidden rounded-xl border bg-card px-4 py-5">
          <p className="text-sm text-muted-foreground">Resultado</p>
          <NotaComTentativas
            destaque
            nota={`Nota ${resultado.nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
            tentativas={tentativas}
          />
          <p className="mt-2 text-sm text-muted-foreground">
            {resultado.acertos} de {resultado.total} questões corretas.
          </p>
          <p className="mt-1 text-sm">{resultado.mensagem}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={baixarPdf}>
            <Download className="size-4" />
            Baixar PDF
          </Button>
        </section>
      ) : iniciada && questoes.length > 0 ? (
        <div className="flex justify-end">
          <Button type="button" className="h-11 px-6" disabled={pending} onClick={() => concluir(false)}>
            {pending ? "Enviando..." : "Enviar prova"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
