import Link from "next/link";
import { recuperarSenha } from "@/actions/auth";
import { Logo } from "@/components/brand/logo";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui/field";

export default function RecuperarSenhaPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="mb-6">
        <Logo size={72} />
      </div>
      <h1 className="text-2xl font-semibold">Recuperar senha</h1>
      <ActionForm action={recuperarSenha} className="mt-6 space-y-4">
        <Field label="E-mail">
          <Input name="email" type="email" required />
        </Field>
        <SubmitButton pendingLabel="Enviando...">Enviar link</SubmitButton>
      </ActionForm>
      <p className="mt-4 text-sm">
        <Link href="/login">Voltar ao login</Link>
      </p>
    </main>
  );
}
