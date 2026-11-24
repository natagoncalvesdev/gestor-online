"use client";

import { useEffect, useState } from "react";
import { liberarMateria, matricularCurso } from "@/actions/alunos";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Select } from "@/components/ui/field";

export function LiberarAcesso({
  alunoId,
  cursos,
}: {
  alunoId: string;
  cursos: { id: string; nome: string; materias: { id: string; nome: string }[] }[];
}) {
  const [cursoId, setCursoId] = useState(cursos[0]?.id ?? "");
  const materias = cursos.find((curso) => curso.id === cursoId)?.materias ?? [];
  const [materiaId, setMateriaId] = useState(materias[0]?.id ?? "");

  useEffect(() => {
    const primeiras = cursos.find((curso) => curso.id === cursoId)?.materias ?? [];
    setMateriaId(primeiras[0]?.id ?? "");
  }, [cursoId, cursos]);

  if (cursos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum curso ativo para liberar.</p>;
  }

  return (
    <div className="space-y-6">
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Curso</span>
        <Select value={cursoId} onChange={(event) => setCursoId(event.target.value)}>
          {cursos.map((curso) => (
            <option key={curso.id} value={curso.id}>
              {curso.nome}
            </option>
          ))}
        </Select>
      </label>
      <ActionForm action={matricularCurso} className="space-y-3">
        <input type="hidden" name="aluno_id" value={alunoId} />
        <input type="hidden" name="produto_id" value={cursoId} />
        <SubmitButton>Matricular</SubmitButton>
      </ActionForm>
      <ActionForm action={liberarMateria} className="space-y-3">
        <input type="hidden" name="aluno_id" value={alunoId} />
        <input type="hidden" name="produto_id" value={cursoId} />
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Matéria</span>
          <Select name="materia_id" value={materiaId} onChange={(event) => setMateriaId(event.target.value)}>
            {materias.map((materia) => (
              <option key={materia.id} value={materia.id}>
                {materia.nome}
              </option>
            ))}
          </Select>
        </label>
        <SubmitButton variant="outline">Liberar esta matéria</SubmitButton>
      </ActionForm>
    </div>
  );
}
