import { redefinirSenha } from "@/actions/auth";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui/field";

export default function RedefinirSenhaPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold">Nova senha</h1>
      <ActionForm action={redefinirSenha} className="mt-6 space-y-4">
        <Field label="Nova senha">
          <Input name="password" type="password" required minLength={8} />
        </Field>
        <SubmitButton>Salvar senha</SubmitButton>
      </ActionForm>
    </main>
  );
}
