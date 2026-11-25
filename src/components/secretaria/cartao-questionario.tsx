import { excluirQuestao, excluirQuestionario, salvarQuestao, salvarQuestionario } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Textarea } from "@/components/ui/field";

export type QuestaoAdmin = {
  id: string;
  enunciado: string;
  ordem: number;
  alternativas: { id: string; texto: string; correta: boolean; ordem: number }[];
};

export function CartaoQuestionario({
  materiaId,
  id,
  titulo,
  encerra,
  notaMinima,
  questoes,
}: {
  materiaId: string;
  id: string;
  titulo: string;
  encerra: boolean;
  notaMinima: string;
  questoes: QuestaoAdmin[];
}) {
  return (
    <div className="space-y-3">
      <ActionForm action={salvarQuestionario} className="grid gap-3">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="materia_id" value={materiaId} />
        <Field label="Título">
          <Input name="titulo" defaultValue={titulo} required />
        </Field>
        <Field label="Nota mínima (vazio usa a da matéria)">
          <Input name="nota_minima" type="number" min={0} max={10} step="0.1" defaultValue={notaMinima} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="encerra_materia" defaultChecked={encerra} />
          Aprovação conclui a matéria e libera a próxima
        </label>
        <SubmitButton size="sm">Salvar questionário</SubmitButton>
      </ActionForm>
      <div className="space-y-2">
        <p className="text-sm font-medium">{questoes.length} {questoes.length === 1 ? "questão" : "questões"}</p>
        {questoes.map((questao) => (
          <details key={questao.id} className="rounded-md border">
            <summary className="cursor-pointer px-3 py-2 text-sm">{questao.ordem}. {questao.enunciado}</summary>
            <div className="space-y-2 border-t px-3 py-3">
              <ul className="space-y-1 text-sm">
                {questao.alternativas.map((alternativa) => (
                  <li key={alternativa.id}>
                    {alternativa.texto}
                    {alternativa.correta ? " · correta" : ""}
                  </li>
                ))}
              </ul>
              <ActionForm action={excluirQuestao}>
                <input type="hidden" name="id" value={questao.id} />
                <input type="hidden" name="materia_id" value={materiaId} />
                <SubmitButton variant="ghost" size="sm">Excluir questão</SubmitButton>
              </ActionForm>
            </div>
          </details>
        ))}
        <details className="rounded-md border border-dashed">
          <summary className="cursor-pointer px-3 py-2 text-sm">Nova questão</summary>
          <ActionForm action={salvarQuestao} className="grid gap-3 border-t px-3 py-3">
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
