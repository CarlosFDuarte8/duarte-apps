import { readdir, readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";
import { rootCertificates } from "node:tls";
import { runMigrations } from "./migration-runner";

nextEnv.loadEnvConfig(process.cwd());

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "Falta DATABASE_URL no .env (ou .env.local). Copie a conexão PostgreSQL em Supabase → Connect → Session pooler, porta 5432, e substitua a senha do banco. As chaves de API não substituem essa conexão.",
    );
    process.exitCode = 1;
    return;
  }
  let url: URL;
  try {
    url = new URL(process.env.DATABASE_URL);
  } catch {
    throw new Error("DATABASE_URL não é uma URL PostgreSQL válida.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error(
      "DATABASE_URL deve começar com postgresql://, não https://.",
    );
  if (url.port === "6543")
    throw new Error(
      "Use a conexão direta ou Session pooler (5432), não Transaction pooler (6543).",
    );
  // Mantenha a verificação do certificado remoto. Não permita sslmode=disable na URL.
  for (const name of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
    url.searchParams.delete(name);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const supabaseHost =
    /^db\.[a-z0-9-]+\.supabase\.co$/.test(url.hostname) ||
    url.hostname.endsWith(".pooler.supabase.com");
  const ca = process.env.DATABASE_SSL_CA_FILE
    ? await readFile(process.env.DATABASE_SSL_CA_FILE, "utf8")
    : supabaseHost
      ? await readFile(
          new URL("../supabase/certs/prod-ca-2021.crt", import.meta.url),
          "utf8",
        )
      : undefined;
  const client = new pg.Client({
    connectionString: url.toString(),
    ssl: local
      ? false
      : {
          rejectUnauthorized: true,
          ...(ca ? { ca: [...rootCertificates, ca] } : {}),
        },
    connectionTimeoutMillis: 15000,
    application_name: "incra08-migrations",
  });
  try {
    await client.connect();
    const directory = new URL("../supabase/migrations/", import.meta.url);
    const names = (await readdir(directory))
      .filter((name) => /^\d+_.*\.sql$/.test(name))
      .sort();
    const files = await Promise.all(
      names.map(async (name) => ({
        name,
        sql: await readFile(new URL(name, directory), "utf8"),
      })),
    );
    files.push({
      name: "seed-inicial.sql",
      sql: await readFile(
        new URL("../supabase/seed.sql", import.meta.url),
        "utf8",
      ),
    });
    const applied = await runMigrations(client, files);
    console.log(
      applied.length
        ? `Banco preparado. Aplicados: ${applied.join(", ")}`
        : "Banco atualizado: nenhuma migration pendente.",
    );
    console.log(
      "O cadastro inicial está pronto. Crie o administrador conforme docs/ESCALAS.md; as escalas históricas são importadas com yarn import:escalas.",
    );
  } finally {
    await client.end();
  }
}

try {
  await main();
} catch (error) {
  // Não imprima objetos de conexão nem credenciais.
  const message =
    error instanceof Error ? error.message : "Falha desconhecida.";
  console.error(
    "Migração não concluída:",
    message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[conexão protegida]"),
  );
  console.error(
    "Confira a conexão e a senha do banco. Caso seu projeto use outra autoridade certificadora, configure DATABASE_SSL_CA_FILE com o caminho do certificado baixado no painel Supabase.",
  );
  process.exitCode = 1;
}
