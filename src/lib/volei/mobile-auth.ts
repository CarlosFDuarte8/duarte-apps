import "server-only";
import { createClient } from "@supabase/supabase-js";
export function mobileHeaders(request: Request) {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0",
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
  });
  const origin = request.headers.get("origin");
  const allowed = [
    new URL(request.url).origin,
    ...(process.env.VOLEI_MOBILE_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ];
  if (origin && !allowed.includes(origin)) return null;
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}
export async function mobileAdmin(request: Request) {
  const bearer = request.headers
    .get("authorization")
    ?.match(/^Bearer ([A-Za-z0-9._~-]{1,16384})$/i)?.[1];
  if (!bearer) return { status: 401 as const, client: null };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { status: 503 as const, client: null };
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: { Authorization: `Bearer ${bearer}` } },
  });
  const user = await client.auth.getUser(bearer);
  if (user.error || !user.data.user)
    return { status: 401 as const, client: null };
  const admin = await client.rpc("is_volei_admin");
  if (admin.error) return { status: 503 as const, client: null };
  if (admin.data !== true) return { status: 403 as const, client: null };
  return { status: 200 as const, client };
}
export function mobileOptions(request: Request) {
  const headers = mobileHeaders(request);
  if (!headers) return new Response(null, { status: 403 });
  headers.set("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  return new Response(null, { status: 204, headers });
}
