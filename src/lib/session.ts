import { createClient } from "@/lib/supabase/server";
import type { Aluno, Session, UsuarioInterno } from "@/lib/supabase/types";
import { isSupabaseConfigured } from "@/lib/site";
import { redirect } from "next/navigation";

export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: interno } = await supabase
    .from("usuario_interno")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (interno) {
    return { type: "interno", user: interno as UsuarioInterno };
  }

  const { data: aluno } = await supabase
    .from("aluno")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (aluno) {
    return { type: "aluno", user: aluno as Aluno };
  }

  return null;
}

export async function requireAluno(): Promise<Extract<Session, { type: "aluno" }>> {
  const session = await getSession();
  if (!session || session.type !== "aluno") redirect("/login");
  return session;
}

export async function requireInterno(): Promise<Extract<Session, { type: "interno" }>> {
  const session = await getSession();
  if (!session || session.type !== "interno") redirect("/login");
  return session;
}

export async function requireAdmin(): Promise<Extract<Session, { type: "interno" }>> {
  const session = await requireInterno();
  if (session.user.papel !== "admin") redirect("/secretaria/dashboard");
  return session;
}
