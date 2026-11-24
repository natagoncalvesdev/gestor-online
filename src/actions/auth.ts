"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { cpfOnlyDigits, formatCpfDisplay, isValidCpf } from "@/lib/cpf";
import { siteUrl } from "@/lib/site";
import type { FormState } from "@/lib/form-state";
import { redirect } from "next/navigation";

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "E-mail ou senha incorretos." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não foi possível entrar." };

  const { data: interno } = await supabase
    .from("usuario_interno")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  redirect(interno ? "/secretaria/dashboard" : "/meus-cursos");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function cadastrar(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return { error: "Cadastro indisponível. Configure a service role do Supabase." };
  }

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const cpf = formatCpfDisplay(cpfOnlyDigits(String(formData.get("cpf") ?? "")));
  const dataNascimento = String(formData.get("data_nascimento") ?? "");
  const telefone = String(formData.get("telefone") ?? "").trim();

  if (nome.length < 5) return { error: "Informe o nome completo." };
  if (!email.includes("@")) return { error: "Informe um e-mail válido." };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (!isValidCpf(cpfOnlyDigits(cpf))) return { error: "CPF inválido." };
  if (!dataNascimento) return { error: "Informe a data de nascimento." };

  const { data: cpfExistente } = await admin.from("aluno").select("id").eq("cpf", cpf).maybeSingle();
  if (cpfExistente) return { error: "Este CPF já está cadastrado." };

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !created.user) {
    const msg = authError?.message ?? "";
    if (msg.toLowerCase().includes("already")) {
      return { error: "Este e-mail já está cadastrado." };
    }
    return { error: "Não foi possível criar a conta." };
  }

  const { error: insertError } = await admin.from("aluno").insert({
    id: created.user.id,
    nome,
    email,
    cpf,
    data_nascimento: dataNascimento,
    telefone,
    numero_aluno: "",
  });

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Não foi possível concluir o cadastro." };
  }

  const supabase = await createClient();
  const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
  if (signError) redirect("/login");
  redirect("/meus-cursos");
}

export async function recuperarSenha(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/redefinir-senha`,
  });
  if (error) return { error: "Não foi possível enviar o e-mail de recuperação." };
  return { ok: "Se o e-mail existir, enviamos o link para redefinir a senha." };
}

export async function redefinirSenha(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Não foi possível redefinir a senha. Abra de novo o link do e-mail." };
  redirect("/meus-cursos");
}
