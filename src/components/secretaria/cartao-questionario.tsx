"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { alternarQuestaoAtiva, atualizarQuestao, excluirQuestaoId, excluirQuestionario, importarQuestoesXml, salvarQuestao, salvarQuestionario } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type QuestaoAdmin = {
  id: string;
  enunciado: string;
  ordem: number;
  ativo: boolean;
  alternativas: { id: string; texto: string; correta: boolean; ordem: number }[];
};

export function CartaoQuestionario({
  materiaId,
  id,
  titulo,
  encerra,
  questoes,
}: {
  materiaId: string;
  id: string;
  titulo: string;
  encerra: boolean;
  questoes: QuestaoAdmin[];
}) {
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const [importando, setImportando] = useState(false);
  const todasAbertas = questoes.length > 0 && questoes.every((questao) => abertas[questao.id]);

  function alternarUma(questaoId: string) {
    setAbertas((atual) => ({ ...atual, [questaoId]: !atual[questaoId] }));
  }

  function alternarTodas() {
    if (todasAbertas) {
      setAbertas({});
      return;
    }
    setAbertas(Object.fromEntries(questoes.map((questao) => [questao.id, true])));
  }

  return (
    <div className="space-y-4">
      <ActionForm action={salvarQuestionario} className="grid gap-3">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="materia_id" value={materiaId} />
        <Field label="Título">
          <Input name="titulo" defaultValue={titulo} required />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="encerra_materia" defaultChecked={encerra} />
          Aprovação conclui a matéria e libera a próxima
        </label>
        <SubmitButton size="sm">Salvar questionário</SubmitButton>
      </ActionForm>

      <div className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-base font-medium">Banco de questões</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Questões objetivas deste questionário. Só as ativas aparecem para o aluno. Cada uma precisa de uma única alternativa correta.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setImportando((atual) => !atual)}>
              Importar XML
            </Button>
            {questoes.length > 0 ? (
              <Button type="button" variant="outline" onClick={alternarTodas}>
                {todasAbertas ? "Recolher todas" : "Expandir todas"}
              </Button>
            ) : null}
          </div>
        </div>

        {importando ? (
          <ActionForm action={importarQuestoesXml} className="grid gap-3 rounded-md border border-dashed p-3" onSuccess={() => setImportando(false)}>
            <input type="hidden" name="materia_id" value={materiaId} />
            <input type="hidden" name="questionario_id" value={id} />
            <Field label="Arquivo XML">
              <Input name="arquivo" type="file" accept=".xml,application/xml,text/xml" required className="h-auto py-1.5" />
            </Field>
            <p className="text-sm text-muted-foreground">As questões de verdadeiro ou falso são acrescentadas a este questionário.</p>
            <SubmitButton size="sm" pendingLabel="Importando...">Adicionar questões do XML</SubmitButton>
          </ActionForm>
        ) : null}

        {questoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma questão cadastrada.</p>
        ) : (
          <div className="space-y-3">
            {questoes.map((questao, indice) => (
              <QuestaoExpansivel
                key={`${questao.id}:${questao.ativo}:${questao.enunciado}:${questao.alternativas.map((item) => `${item.ordem}:${item.correta}:${item.texto}`).join("|")}`}
                materiaId={materiaId}
                indice={indice + 1}
                questao={questao}
                aberta={Boolean(abertas[questao.id])}
                onAlternar={() => alternarUma(questao.id)}
              />
            ))}
          </div>
        )}

        <details className="rounded-md border border-dashed">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Nova questão</summary>
          <ActionForm action={salvarQuestao} className="grid gap-3 border-t px-4 py-4">
            <input type="hidden" name="materia_id" value={materiaId} />
            <input type="hidden" name="questionario_id" value={id} />
            <Field label="Ordem">
              <Input name="ordem" type="number" min={1} defaultValue={questoes.length + 1} />
            </Field>
            <Field label="Enunciado">
              <Textarea name="enunciado" required />
            </Field>
            {[1, 2, 3, 4].map((numero) => (
              <Field key={numero} label={`Alternativa ${numero}`}>
                <Input name={`alt_${numero}`} />
              </Field>
            ))}
            <Field label="Alternativa correta">
              <select name="correta" className="h-10 w-full rounded-md border bg-white px-3 text-sm" defaultValue="1">
                <option value="1">Alternativa 1</option>
                <option value="2">Alternativa 2</option>
                <option value="3">Alternativa 3</option>
                <option value="4">Alternativa 4</option>
              </select>
            </Field>
            <SubmitButton size="sm">Adicionar questão</SubmitButton>
          </ActionForm>
        </details>
      </div>

      <ActionForm action={excluirQuestionario}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="materia_id" value={materiaId} />
        <SubmitButton variant="ghost" size="sm">Excluir questionário</SubmitButton>
      </ActionForm>
    </div>
  );
}

function QuestaoExpansivel({
  materiaId,
  indice,
  questao,
  aberta,
  onAlternar,
}: {
  materiaId: string;
  indice: number;
  questao: QuestaoAdmin;
  aberta: boolean;
  onAlternar: () => void;
}) {
  const router = useRouter();
  const [enunciado, setEnunciado] = useState(questao.enunciado);
  const [alternativas, setAlternativas] = useState(() =>
    questao.alternativas.map((item) => ({ texto: item.texto, correta: item.correta }))
  );
  const [ativo, setAtivo] = useState(questao.ativo);
  const [pending, startTransition] = useTransition();

  function marcarCorreta(index: number) {
    setAlternativas((atual) => atual.map((item, i) => ({ ...item, correta: i === index })));
  }

  function salvar() {
    startTransition(async () => {
      const resultado = await atualizarQuestao(materiaId, questao.id, enunciado, alternativas);
      if ("error" in resultado) toast.error(resultado.error);
      else {
        toast.success("Questão salva");
        router.refresh();
      }
    });
  }

  function excluir() {
    if (!window.confirm("Excluir esta questão do banco?")) return;
    startTransition(async () => {
      const resultado = await excluirQuestaoId(materiaId, questao.id);
      if ("error" in resultado) toast.error(resultado.error);
      else {
        toast.success("Questão excluída");
        router.refresh();
      }
    });
  }

  function alternar(ligado: boolean) {
    setAtivo(ligado);
    startTransition(async () => {
      const resultado = await alternarQuestaoAtiva(materiaId, questao.id, ligado);
      if ("error" in resultado) {
        setAtivo(!ligado);
        toast.error(resultado.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-md border">
      <div className="flex items-start gap-2 p-4">
        <button type="button" className="flex min-w-0 flex-1 items-start gap-2 text-left" aria-expanded={aberta} onClick={onAlternar}>
          <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform", aberta && "rotate-180")} />
          <span className="min-w-0">
            <span className="block text-sm font-medium">Questão {indice}</span>
            <span className="mt-1 block whitespace-pre-wrap text-sm text-muted-foreground">{enunciado.trim() || "Sem enunciado"}</span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-2 text-sm">
          <span className="text-muted-foreground">{ativo ? "Ativa" : "Inativa"}</span>
          <Interruptor
            ligado={ativo}
            disabled={pending}
            onChange={alternar}
            rotulo={ativo ? "Desativar questão" : "Ativar questão"}
          />
        </div>
      </div>
      {aberta ? (
        <div className="space-y-3 border-t px-4 py-4">
          <Field label="Enunciado">
            <Textarea id={`enunciado-${questao.id}`} value={enunciado} onChange={(evento) => setEnunciado(evento.target.value)} rows={3} />
          </Field>
          <AlternativasEditor name={`correta-${questao.id}`} alternativas={alternativas} onChange={setAlternativas} onMarcar={marcarCorreta} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={salvar}>
              Salvar questão
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={pending} onClick={excluir}>
              Excluir
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AlternativasEditor({
  name,
  alternativas,
  onChange,
  onMarcar,
}: {
  name: string;
  alternativas: { texto: string; correta: boolean }[];
  onChange: (proximas: { texto: string; correta: boolean }[]) => void;
  onMarcar: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Marque a alternativa correta.</p>
      {alternativas.map((alternativa, index) => (
        <div key={index} className="flex items-start gap-2">
          <input
            type="radio"
            name={name}
            className="mt-2.5"
            checked={alternativa.correta}
            onChange={() => onMarcar(index)}
            aria-label={`Alternativa ${index + 1} é a correta`}
          />
          <Input
            value={alternativa.texto}
            onChange={(evento) => {
              const texto = evento.target.value;
              onChange(alternativas.map((item, i) => (i === index ? { ...item, texto } : item)));
            }}
            placeholder={`Alternativa ${index + 1}`}
            aria-label={`Texto da alternativa ${index + 1}`}
          />
          {alternativas.length > 2 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const restantes = alternativas.filter((_, i) => i !== index);
                if (!restantes.some((item) => item.correta) && restantes[0]) restantes[0] = { ...restantes[0], correta: true };
                onChange(restantes);
              }}
            >
              Remover
            </Button>
          ) : null}
        </div>
      ))}
      {alternativas.length < 6 ? (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...alternativas, { texto: "", correta: false }])}>
          Adicionar alternativa
        </Button>
      ) : null}
    </div>
  );
}

function Interruptor({
  ligado,
  disabled,
  onChange,
  rotulo,
}: {
  ligado: boolean;
  disabled?: boolean;
  onChange: (ligado: boolean) => void;
  rotulo: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      disabled={disabled}
      onClick={() => onChange(!ligado)}
      className={cn(
        "relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full transition-colors",
        ligado ? "bg-primary" : "bg-input",
        disabled && "opacity-50"
      )}
    >
      <span className={cn("pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform", ligado ? "translate-x-[14px]" : "translate-x-0.5")} />
    </button>
  );
}
