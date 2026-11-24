import { salvarUsuarioInterno } from "@/actions/catalogo";
import { ActionForm } from "@/components/action-form";
import { PageTitle } from "@/components/page-title";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/session";

export default async function UsuariosInternosPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("usuario_interno").select("id, nome, email, papel, status").order("nome");

  return (
    <div className="space-y-8">
      <PageTitle title="Usuários internos" description="Administrador monta o catálogo. Secretaria cuida dos alunos." />
      <ul className="divide-y rounded-xl border bg-card">
        {(data ?? []).map((usuario) => (
          <li key={usuario.id} className="p-4">
            <p className="font-medium">{usuario.nome}</p>
            <p className="text-sm text-muted-foreground">
              {usuario.email} · {usuario.papel === "admin" ? "Administrador" : "Secretaria"}
              {usuario.status === "inativo" ? " · inativo" : ""}
            </p>
          </li>
        ))}
      </ul>
      <ActionForm action={salvarUsuarioInterno} className="grid max-w-xl gap-4">
        <h2 className="font-semibold">Novo usuário</h2>
        <Field label="Nome">
          <Input name="nome" required />
        </Field>
        <Field label="E-mail">
          <Input name="email" type="email" required />
        </Field>
        <Field label="Senha inicial">
          <Input name="password" type="password" required minLength={8} />
        </Field>
        <Field label="Papel">
          <Select name="papel" defaultValue="secretaria">
            <option value="secretaria">Secretaria</option>
            <option value="admin">Administrador</option>
          </Select>
        </Field>
        <SubmitButton>Criar usuário</SubmitButton>
      </ActionForm>
    </div>
  );
}
