import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { sessionClient, serviceClient } from "@/lib/escalas/supabase";
import { webPushConfigured, sendWebPush } from "@/lib/volei/web-push";
import {
  webSubscriptionSchema,
  validPushEndpoint,
} from "@/lib/volei/web-push-validation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
async function session() {
  const client = await sessionClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return null;
  const admin = await client.rpc("is_volei_admin");
  return !admin.error && admin.data ? user : null;
}
const command = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("subscribe"),
    subscription: webSubscriptionSchema,
  }),
  z.object({
    action: z.enum(["status", "unsubscribe", "test"]),
    endpoint: z.string().max(2048).refine(validPushEndpoint),
  }),
]);
export async function GET() {
  try {
    if (!(await session()))
      return Response.json(
        { error: "Entre como administrador." },
        { status: 401, headers },
      );
    return Response.json(
      {
        configured: webPushConfigured(),
        publicKey: webPushConfigured()
          ? process.env.VOLEI_WEB_PUSH_PUBLIC_KEY
          : null,
      },
      { headers },
    );
  } catch {
    return Response.json(
      { error: "Configuração indisponível." },
      { status: 503, headers },
    );
  }
}
export async function POST(request: Request) {
  // Cookie-authenticated mutations must originate from this site.
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { error: "Origem inválida." },
      { status: 403, headers },
    );
  try {
    const user = await session();
    if (!user)
      return Response.json(
        { error: "Entre como administrador." },
        { status: 401, headers },
      );
    const raw = await request.text();
    if (raw.length > 8192)
      return Response.json(
        { error: "Solicitação muito grande." },
        { status: 413, headers },
      );
    let input: unknown;
    try {
      input = JSON.parse(raw);
    } catch {
      return Response.json(
        { error: "Solicitação inválida." },
        { status: 400, headers },
      );
    }
    const parsed = command.safeParse(input);
    if (!parsed.success)
      return Response.json(
        { error: "Navegador inválido." },
        { status: 400, headers },
      );
    const data = parsed.data;
    // Unsubscribe works even if delivery has been disabled on the server.
    if (data.action !== "unsubscribe" && !webPushConfigured())
      return Response.json(
        { error: "Os avisos ainda precisam ser ativados no servidor." },
        { status: 503, headers },
      );
    const client = serviceClient();
    if (data.action === "subscribe") {
      const result = await client.rpc("volei_save_web_subscription", {
        p_user: user.id,
        p_endpoint: data.subscription.endpoint,
        p_p256dh: data.subscription.keys.p256dh,
        p_auth: data.subscription.keys.auth,
      });
      if (result.error || !result.data) throw Error();
      (await cookies()).set("volei-web-push-id", result.data, {
        httpOnly: true,
        secure: new URL(request.url).protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge: 90 * 86400,
      });
      return Response.json({ enabled: true }, { headers });
    }
    const query = client.from("volei_web_push_subscriptions");
    if (data.action === "unsubscribe") {
      const result = await query
        .delete()
        .eq("user_id", user.id)
        .eq("endpoint", data.endpoint);
      if (result.error) throw Error();
      (await cookies()).delete("volei-web-push-id");
      return Response.json({ enabled: false }, { headers });
    }
    const result = await query
      .select("id,endpoint,p256dh,auth,expires_at")
      .eq("user_id", user.id)
      .eq("endpoint", data.endpoint)
      .maybeSingle();
    if (result.error) throw Error();
    const row = result.data;
    if (data.action === "test") {
      if (!row || Date.parse(row.expires_at) <= Date.now())
        return Response.json(
          { error: "Ative novamente os avisos neste navegador." },
          { status: 409, headers },
        );
      await sendWebPush(row, {
        id: randomUUID(),
        title: "Teste do vôlei",
        body: "Os avisos deste computador estão funcionando, mesmo com a aba fechada.",
        href: "/admin/volei/notificacoes",
      });
      return Response.json({ sent: true }, { headers });
    }
    // Renew only an already-owned registration while its admin is active.
    if (row) {
      const renewed = await client
        .from("volei_web_push_subscriptions")
        .update({
          expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
        })
        .eq("id", row.id)
        .eq("user_id", user.id);
      if (renewed.error) throw Error();
    }
    return Response.json({ enabled: !!row }, { headers });
  } catch {
    return Response.json(
      {
        error:
          "Não foi possível atualizar os avisos. Confira a configuração do servidor.",
      },
      { status: 503, headers },
    );
  }
}
