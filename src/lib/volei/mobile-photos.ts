import "server-only";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { signPhotos } from "./photos";

const inputSchema = z
  .object({
    people: z
      .array(
        z.object({ kind: z.enum(["member", "guest"]), id: z.uuid() }).strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
const noStore = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Origin",
  "X-Content-Type-Options": "nosniff",
};
function responseHeaders(request: Request) {
  const headers = new Headers(noStore);
  const origin = request.headers.get("origin");
  const allowed = new Set([
    new URL(request.url).origin,
    ...(process.env.VOLEI_MOBILE_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ]);
  if (origin && !allowed.has(origin)) return null;
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}
export function mobilePhotoPreflight(request: Request) {
  const headers = responseHeaders(request);
  if (!headers)
    return Response.json(
      { error: "Origem não permitida." },
      { status: 403, headers: noStore },
    );
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  return new Response(null, { status: 204, headers });
}
export async function serveMobilePhotos(request: Request) {
  const headers = responseHeaders(request);
  if (!headers)
    return Response.json(
      { error: "Origem não permitida." },
      { status: 403, headers: noStore },
    );
  const fail = (status: number, error: string) =>
    Response.json({ error }, { status, headers });
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer ([A-Za-z0-9._~-]+)$/i);
  if (!match || match[1].length > 16384)
    return fail(401, "Sessão inválida ou expirada.");
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return fail(415, "Envie os identificadores em JSON.");
  // Limit streamed bodies too; Content-Length can be missing or forged.
  if (Number(request.headers.get("content-length")) > 20000)
    return fail(413, "Solicitação muito grande.");
  let body = "";
  const reader = request.body?.getReader();
  if (!reader) return fail(400, "Informe os participantes.");
  try {
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 20000) {
        await reader.cancel();
        return fail(413, "Solicitação muito grande.");
      }
      chunks.push(value);
    }
    const decoder = new TextDecoder();
    body =
      chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join("") +
      decoder.decode();
  } catch {
    return fail(400, "Solicitação inválida.");
  } finally {
    reader.releaseLock();
  }
  let parsed;
  try {
    parsed = inputSchema.safeParse(JSON.parse(body));
  } catch {
    return fail(400, "Solicitação inválida.");
  }
  if (!parsed.success)
    return fail(400, "Informe até 100 identificadores válidos.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return fail(503, "Fotos temporariamente indisponíveis.");
  try {
    // Request-scoped client: never reuse a visitor's bearer token across requests.
    const client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { headers: { Authorization: `Bearer ${match[1]}` } },
    });
    const verified = await client.auth.getUser(match[1]);
    if (verified.error || !verified.data.user)
      return fail(401, "Sessão inválida ou expirada.");
    const admin = await client.rpc("is_volei_admin");
    if (admin.error) return fail(503, "Não foi possível conferir o acesso.");
    if (admin.data !== true)
      return fail(403, "Acesso administrativo obrigatório.");
    const people = [
      ...new Map(
        parsed.data.people.map((person) => [
          `${person.kind}:${person.id}`,
          person,
        ]),
      ).values(),
    ];
    const rows: {
      kind: "member" | "guest";
      id: string;
      photo_path: string | null;
    }[] = [];
    for (const kind of ["member", "guest"] as const) {
      const ids = people
        .filter((person) => person.kind === kind)
        .map((person) => person.id);
      if (!ids.length) continue;
      // Resolve paths from rows visible through the caller's RLS, never from request input.
      const result = await client
        .from(kind === "member" ? "volei_members" : "volei_guests")
        .select("id,photo_path")
        .in("id", ids);
      if (result.error)
        return fail(503, "Não foi possível consultar as fotos.");
      rows.push(
        ...(result.data ?? []).map((row) => ({
          kind,
          id: row.id as string,
          photo_path: row.photo_path as string | null,
        })),
      );
    }
    const issuedAt = Date.now();
    // service_role is instantiated only inside this server-only signer, after authorization.
    const signed = await signPhotos(rows);
    const byKey = new Map(
      signed.map((row) => [`${row.kind}:${row.id}`, row.photo_url]),
    );
    return Response.json(
      {
        people: people.map((person) => ({
          ...person,
          url: byKey.get(`${person.kind}:${person.id}`) ?? null,
        })),
        expiresAt: new Date(issuedAt + 3600000).toISOString(),
      },
      { headers },
    );
  } catch {
    return fail(503, "Fotos temporariamente indisponíveis.");
  }
}
