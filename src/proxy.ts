import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Só pra quem ainda não logou — não faz sentido acessar de novo já autenticado.
const PUBLIC_ONLY_PATHS = ["/login", "/signup"];
// Também não exigem sessão, mas continuam acessíveis mesmo pra quem já está
// logado (ex.: clicar num link de redefinição de senha antigo enquanto já
// tem uma sessão válida em outra aba não deveria só jogar pra home sem
// explicação — a própria página decide se o token ainda é válido ou não).
const PUBLIC_PATHS = [...PUBLIC_ONLY_PATHS, "/esqueci-senha", "/redefinir-senha"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isPublicOnly = PUBLIC_ONLY_PATHS.some((p) => pathname.startsWith(p));

  if (!req.auth && !isPublic) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (req.auth && isPublicOnly) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  // Também exclui arquivos estáticos em /public (ex: a logo) — sem isso, o
  // otimizador de imagem do Next (que busca a imagem local via uma requisição
  // interna) cai na regra de autenticação e recebe a página de login no lugar
  // da imagem, quebrando o <Image> em qualquer lugar do app. sw.js (service
  // worker das notificações push) também precisa ficar de fora: o navegador
  // revalida esse arquivo periodicamente por conta própria, e se receber um
  // redirect para /login em vez do JS, ele desregistra o service worker.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)"],
};
