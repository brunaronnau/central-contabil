import nodemailer from "nodemailer";

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !port || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });
}

export function emailConfigurado() {
  return getTransport() !== null;
}

export async function enviarEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const transport = getTransport();
  if (!transport) {
    throw new Error("Envio de e-mail não configurado (defina SMTP_HOST, SMTP_PORT, SMTP_USER e SMTP_PASS no .env).");
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transport.sendMail({ from, to, subject, html });
}
