"use server";

import crypto from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { emailConfigurado, enviarEmail } from "@/lib/mailer";

export type ActionResult = { error: string | null; success?: boolean };

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

const solicitarSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
});

export async function solicitarResetSenha(formData: FormData): Promise<ActionResult> {
  const parsed = solicitarSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "E-mail inválido." };
  }

  if (!emailConfigurado()) {
    return { error: "O envio de e-mail ainda não foi configurado neste servidor. Peça pra um administrador redefinir sua senha em Usuários." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Não revela se o e-mail existe ou não na conta — mesma resposta nos dois casos.
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });

    const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
    const link = `${baseUrl}/redefinir-senha?token=${token}`;

    await enviarEmail({
      to: user.email,
      subject: "Redefinição de senha — Central Contábil",
      html: `
        <p>Olá, ${user.name}.</p>
        <p>Recebemos um pedido para redefinir a senha da sua conta na Central Contábil (Navecon).</p>
        <p><a href="${link}">Clique aqui para escolher uma nova senha</a></p>
        <p>Esse link expira em 1 hora. Se você não pediu isso, pode ignorar este e-mail.</p>
      `,
    }).catch(() => {
      // Falha de envio não vaza pro usuário — evitaria indicar se o e-mail existe.
    });
  }

  return { error: null, success: true };
}

const redefinirSchema = z
  .object({
    token: z.string().min(1, "Link inválido."),
    password: z.string().min(4, "A senha deve ter ao menos 4 caracteres."),
    confirmar: z.string(),
  })
  .refine((d) => d.password === d.confirmar, { message: "As senhas não coincidem.", path: ["confirmar"] });

export async function redefinirSenha(formData: FormData): Promise<ActionResult> {
  const parsed = redefinirSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmar: formData.get("confirmar"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const registro = await prisma.passwordResetToken.findUnique({ where: { token: parsed.data.token } });
  if (!registro || registro.usedAt || registro.expiresAt < new Date()) {
    return { error: 'Este link não é mais válido. Peça um novo em "Esqueci minha senha".' };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: registro.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: registro.id }, data: { usedAt: new Date() } }),
  ]);

  return { error: null, success: true };
}
