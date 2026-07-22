"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome completo."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[^\s@]+@navecon\.net\.br$/i,
      "Use seu e-mail corporativo no formato nome_da_pessoa@navecon.net.br.",
    ),
  password: z.string().min(4, "A senha deve ter ao menos 4 caracteres."),
  birthday: z.string().optional(),
});

export type ActionResult = { error: string } | { error: null };

export async function signup(formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    birthday: formData.get("birthday") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, email, password, birthday } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe uma conta com este e-mail. Faça login." };
  }

  const userCount = await prisma.user.count();
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      isAdmin: userCount === 0,
      birthday: birthday ? new Date(birthday) : null,
    },
  });

  return login(formData);
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Informe seu e-mail."),
  password: z.string().min(1, "Informe sua senha."),
});

export async function login(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "E-mail ou senha inválidos." };
    }
    throw err;
  }

  return { error: null };
}
