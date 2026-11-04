import type { NextConfig } from "next";
import path from "path";
import { existsSync, readFileSync } from "node:fs";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const output = process.env.VOLLEY_E2E === "1" ? ".next-e2e" : ".next";
const sessionFile = path.join(__dirname, output, "development-session");

const nextConfig: NextConfig = {
  distDir: output,
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

export default function config(phase: string): NextConfig {
  return {
    ...nextConfig,
    // Bust browser asset URLs and detect old tabs after restarting development.
    deploymentId: phase === PHASE_DEVELOPMENT_SERVER && existsSync(sessionFile)
      ? readFileSync(sessionFile, "utf8").trim() : undefined,
  };
}
