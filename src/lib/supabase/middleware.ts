import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/site";

const ADMIN_PREFIXES = [
  "/secretaria/materias",
  "/secretaria/produtos",
  "/secretaria/usuarios-internos",
];

function isPublic(pathname: string) {
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname === "/recuperar-senha" ||
    pathname === "/redefinir-senha" ||
    pathname === "/carrinho" ||
    pathname === "/sem-acesso"
  ) {
    return true;
  }
  if (pathname.startsWith("/loja")) return true;
  if (pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/api/mercadopago/")) return true;
  return false;
}

function isAlunoApp(pathname: string) {
  return (
    pathname.startsWith("/meus-cursos") ||
    pathname.startsWith("/aula") ||
    pathname.startsWith("/prova") ||
    pathname.startsWith("/pedidos") ||
    pathname.startsWith("/perfil") ||
    pathname.startsWith("/checkout")
  );
}

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/ebook") || pathname.startsWith("/api/documento")) {
    return supabaseResponse;
  }

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!user) return supabaseResponse;

  const { data: interno } = await supabase
    .from("usuario_interno")
    .select("papel")
    .eq("id", user.id)
    .maybeSingle();

  const { data: aluno } = interno
    ? { data: null }
    : await supabase.from("aluno").select("id").eq("id", user.id).maybeSingle();

  const destinoInterno = "/secretaria/dashboard";
  const destinoAluno = "/meus-cursos";

  if (pathname === "/login" || pathname === "/cadastro") {
    const url = request.nextUrl.clone();
    url.pathname = interno ? destinoInterno : aluno ? destinoAluno : "/sem-acesso";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/secretaria")) {
    if (!interno) {
      const url = request.nextUrl.clone();
      url.pathname = aluno ? destinoAluno : "/sem-acesso";
      return NextResponse.redirect(url);
    }
    const adminOnly = ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    if (adminOnly && interno.papel !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = destinoInterno;
      return NextResponse.redirect(url);
    }
  }

  if (isAlunoApp(pathname) && !aluno) {
    const url = request.nextUrl.clone();
    url.pathname = interno ? destinoInterno : "/sem-acesso";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
