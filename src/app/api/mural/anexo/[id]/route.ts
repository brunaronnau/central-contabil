import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const anexo = await prisma.recadoAnexo.findUnique({
    where: { id },
    select: { nome: true, tipo: true, dados: true },
  });
  if (!anexo) return new NextResponse("Anexo não encontrado.", { status: 404 });

  const bytes = Buffer.from(anexo.dados, "base64");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": anexo.tipo,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(anexo.nome)}"`,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
