// Accepted only by the local Supabase fixture, never by a real project.
export function fixtureAdminSession() {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const access = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "44444444-4444-4444-8444-444444444444", role: "authenticated", exp: now + 86400, iat: now })}.fixture`;
  return "base64-" + encode({ access_token: access, refresh_token: "fixture", expires_at: now + 86400, expires_in: 86400, token_type: "bearer" });
}
