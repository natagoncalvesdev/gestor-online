import Link from "next/link";
import { cadastrar } from "@/actions/auth";
import { Logo } from "@/components/brand/logo";
import { ActionForm } from "@/components/action-form";
import { CpfInput } from "@/components/cpf-input";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui/field";

export default function CadastroPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6">
        <Logo size={72} />
      </div>
      <h1 className="text-2xl font-semibold">Criar conta de aluno</h1>
      <ActionForm action={cadastrar} className="mt-6 space-y-4">
        <Field label="Nome completo">
          <Input name="nome" required />
        </Field>
        <Field label="E-mail">
          <Input name="email" type="email" required />
        </Field>
        <Field label="Senha">
          <Input name="password" type="password" required minLength={8} />
        </Field>
        <Field label="CPF">
          <CpfInput />
        </Field>
        <Field label="Data de nascimento">
          <Input name="data_nascimento" type="date" required />
        </Field>
        <Field label="Telefone">
          <Input name="telefone" />
        </Field>
        <SubmitButton pendingLabel="Criando conta...">Criar conta</SubmitButton>
      </ActionForm>
      <p className="mt-4 text-sm">
        Já tem conta? <Link href="/login">Entrar</Link>
      </p>
    </main>
  );
}
