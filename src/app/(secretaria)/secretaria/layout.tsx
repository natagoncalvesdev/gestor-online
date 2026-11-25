import { AppShell } from "@/components/layout/app-shell";
import type { NavItem } from "@/components/layout/nav-links";
import { requireInterno } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SecretariaLayout({ children }: { children: React.ReactNode }) {
  const session = await requireInterno();
  const itens: NavItem[] = [
    { href: "/secretaria/dashboard", label: "Início" },
    { href: "/secretaria/alunos", label: "Alunos" },
    { href: "/secretaria/pedidos", label: "Pedidos" },
  ];
  if (session.user.papel === "admin") {
    itens.push(
      { href: "/secretaria/materias", label: "Matérias" },
      {
        label: "Produtos",
        children: [
          { href: "/secretaria/produtos", label: "Todos os produtos" },
          { href: "/secretaria/produtos/categorias", label: "Categorias" },
        ],
      },
      { href: "/secretaria/pagina-inicial", label: "Página inicial" },
      { href: "/secretaria/usuarios-internos", label: "Usuários internos" }
    );
  }

  return (
    <AppShell alinhar="esquerda" area={`${session.user.nome} · ${session.user.papel === "admin" ? "Admin" : "Secretaria"}`} items={itens}>
      {children}
    </AppShell>
  );
}
