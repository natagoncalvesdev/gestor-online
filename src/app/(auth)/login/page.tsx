import Link from "next/link";
import { login } from "@/actions/auth";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui/field";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <Link href="/" className="mb-6 text-lg font-semibold text-primary">
        CETADEB Online
      </Link>
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Aluno, secretaria ou administrador usam o mesmo acesso. O destino muda conforme a conta.
      </p>
      <ActionForm action={login} className="space-y-4">
        <Field label="E-mail">
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Senha">
          <Input name="password" type="password" required autoComplete="current-password" />
        </Field>
        <SubmitButton pendingLabel="Entrando...">Entrar</SubmitButton>
      </ActionForm>
      <p className="mt-4 text-sm">
        <Link href="/recuperar-senha">Esqueci a senha</Link>
      </p>
      <p className="mt-2 text-sm">
        Ainda não tem conta? <Link href="/cadastro">Cadastre-se</Link>
      </p>
    </main>
  );
}
