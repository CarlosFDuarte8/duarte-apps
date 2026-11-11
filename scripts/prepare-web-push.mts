import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { generateVAPIDKeys } from "web-push";
const keys = generateVAPIDKeys();
await mkdir("supabase/private", { recursive: true });
try {
  await writeFile(
    "supabase/private/web-push.env",
    [
      "VOLEI_WEB_PUSH_ENABLED=false",
      `VOLEI_WEB_PUSH_PUBLIC_KEY=${keys.publicKey}`,
      `VOLEI_WEB_PUSH_PRIVATE_KEY=${keys.privateKey}`,
      "VOLEI_WEB_PUSH_SUBJECT=https://duarte-apps.vercel.app",
      `VOLEI_WEB_PUSH_CRON_SECRET=${randomBytes(32).toString("base64url")}`,
      "",
    ].join("\n"),
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    "Configuração criada em supabase/private/web-push.env (ignorada pelo Git). Cadastre os valores no servidor, sem compartilhar o arquivo.",
  );
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === "EEXIST")
    console.log(
      "O arquivo de configuração já existe. As chaves foram preservadas.",
    );
  else throw Error("Não foi possível salvar a configuração privada.");
}
