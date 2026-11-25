import { atualizarPerfil } from "@/actions/alunos";
import { logout } from "@/actions/auth";
import { ActionForm } from "@/components/action-form";
import { EnderecoCampos } from "@/components/endereco-campos";
import { PageTitle } from "@/components/page-title";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui/field";
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
      </dl>
      <ActionForm action={atualizarPerfil} className="flex flex-col gap-6">
        <Field label="Telefone">
          <Input name="telefone" defaultValue={aluno.telefone} />
        </Field>
        <EnderecoCampos finalidade="entrega" endereco={aluno.endereco_entrega} />
        <EnderecoCampos finalidade="cobranca" endereco={aluno.endereco_cobranca} />
        <div>
          <SubmitButton>Salvar contato e endereços</SubmitButton>
        </div>
      </ActionForm>
      <form action={logout} className="mt-4">
        <SubmitButton variant="outline">Sair</SubmitButton>
      </form>
    </div>
  );
}