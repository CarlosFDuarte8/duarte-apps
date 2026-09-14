import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Keep the development badge from covering the mobile navigation.
  devIndicators: false,
  allowedDevOrigins: ["local-origin.dev", "*.local-origin.dev"],
  // Fixe a raiz do projeto para que o Turbopack não utilize o arquivo de trava (lockfile) não relacionado localizado no diretório pessoal do usuário.
  turbopack: {
    root: path.join(__dirname)
  }
};

export default nextConfig;
