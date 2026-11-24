import { atualizarPerfil } from "@/actions/alunos";
import { logout } from "@/actions/auth";
import { ActionForm } from "@/components/action-form";
import { PageTitle } from "@/components/page-title";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select } from "@/components/ui/field";
import { ESTADOS, rotuloUf } from "@/lib/estados";
import { formatCpfDisplay } from "@/lib/cpf";
import { formatDate } from "@/lib/format";
import { requireAluno } from "@/lib/session";

export default async function PerfilPage() {
  const session = await requireAluno();
  const aluno = session.user;

  return (
    <div>
      <PageTitle title="Perfil" description="Nome, CPF e nascimento são alterados pela secretaria." />
      <dl className="mb-6 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Nome</dt>
          <dd>{aluno.nome}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">E-mail</dt>
          <dd>{aluno.email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">CPF</dt>
          <dd>{formatCpfDisplay(aluno.cpf)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Nascimento</dt>
          <dd>{formatDate(aluno.data_nascimento)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Número do aluno</dt>
          <dd>{aluno.numero_aluno}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Estado</dt>
          <dd>{rotuloUf(aluno.uf)}</dd>
        </div>
      </dl>
      <ActionForm action={atualizarPerfil} className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone">
          <Input name="telefone" defaultValue={aluno.telefone} />
        </Field>
        <Field label="CEP">
          <Input name="cep" defaultValue={aluno.cep} />
        </Field>
        <Field label="Endereço">
          <Input name="logradouro" defaultValue={aluno.logradouro} />
        </Field>
        <Field label="Número">
          <Input name="numero" defaultValue={aluno.numero} />
        </Field>
        <Field label="Complemento">
          <Input name="complemento" defaultValue={aluno.complemento} />
        </Field>
        <Field label="Bairro">
          <Input name="bairro" defaultValue={aluno.bairro} />
        </Field>
        <Field label="Cidade">
          <Input name="cidade" defaultValue={aluno.cidade} />
        </Field>
        <Field label="Estado">
          <Select name="uf" defaultValue={aluno.uf}>
            <option value="">Selecione</option>
            {ESTADOS.map((estado) => (
              <option key={estado.uf} value={estado.uf}>
                {estado.nome} ({estado.uf})
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <SubmitButton>Salvar contato e endereço</SubmitButton>
        </div>
      </ActionForm>
      <form action={logout} className="mt-4">
        <SubmitButton variant="outline">Sair</SubmitButton>
      </form>
    </div>
  );
}
