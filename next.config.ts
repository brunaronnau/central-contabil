import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Anexos do Mural vão em base64 direto no Postgres (sem storage de objetos
      // configurado ainda) — precisa de mais espaço que o padrão de 1MB.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
