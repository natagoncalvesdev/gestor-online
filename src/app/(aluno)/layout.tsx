import { AppShell } from "@/components/layout/app-shell";
import { requireAluno } from "@/lib/session";

export const dynamic = "force-dynamic";

const ITENS = [
  { href: "/meus-cursos", label: "Meus cursos" },
  { href: "/loja", label: "Loja" },
  { href: "/pedidos", label: "Pedidos" },
  { href: "/perfil", label: "Perfil" },
];

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAluno();
  return (
    <AppShell area={session.user.nome} items={ITENS}>
      {children}
    </AppShell>
  );
}
