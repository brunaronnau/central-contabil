import type { NextAuthConfig } from "next-auth";

// Configuração "base" do Auth.js — sem o provider de Credentials (que depende
// do Prisma). É usada pelo proxy.ts, que roda no Edge Runtime e não suporta
// os módulos Node.js exigidos pelo cliente do Prisma.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
