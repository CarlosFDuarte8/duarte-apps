import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  distDir: process.env.VOLLEY_E2E === "1" ? ".next-e2e" : ".next",
  // Keep the development badge from covering the mobile navigation.
  devIndicators: false,
  // Allow browsing the dev server from other devices on the local network (e.g. testing on a phone).
  allowedDevOrigins: [
    "127.0.0.1",
    "local-origin.dev",
    "*.local-origin.dev",
    "192.168.1.101",
    "192.168.1.106",
    "192.168.1.107",
  ],
  // Fixe a raiz do projeto para que o Turbopack não utilize o arquivo de trava (lockfile) não relacionado localizado no diretório pessoal do usuário.
  turbopack: {
    root: path.join(__dirname)
  }
};

export default nextConfig;
