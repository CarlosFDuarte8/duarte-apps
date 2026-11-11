import "server-only";
import { sendNotification } from "web-push";
import { serviceClient } from "@/lib/escalas/supabase";
import { validPushEndpoint } from "./web-push-validation";
export function webPushConfigured() {
  return (
    process.env.VOLEI_WEB_PUSH_ENABLED === "true" &&
    !!process.env.VOLEI_WEB_PUSH_PUBLIC_KEY &&
    !!process.env.VOLEI_WEB_PUSH_PRIVATE_KEY &&
    !!process.env.VOLEI_WEB_PUSH_SUBJECT
  );
}
export async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { id: string; title: string; body: string; href: string },
) {
  if (!webPushConfigured() || !validPushEndpoint(subscription.endpoint))
    throw Error("Push indisponível.");
  return sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload),
    {
      TTL: 3600,
      urgency: "normal",
      timeout: 10000,
      vapidDetails: {
        subject: process.env.VOLEI_WEB_PUSH_SUBJECT!,
        publicKey: process.env.VOLEI_WEB_PUSH_PUBLIC_KEY!,
        privateKey: process.env.VOLEI_WEB_PUSH_PRIVATE_KEY!,
      },
    },
  );
}
type Job = {
  id: string;
  subscription_id: string;
  title: string;
  body: string;
  href: string;
  attempts: number;
  claimed_at: string;
};
export async function dispatchWebPush() {
  if (!webPushConfigured()) throw Error("Push desativado.");
  const client = serviceClient();
  const claimed = await client.rpc("volei_claim_web_push", { p_limit: 20 });
  if (claimed.error) throw Error("Fila indisponível.");
  const jobs = (claimed.data ?? []) as Job[];
  let sent = 0;
  async function save(job: Job, changes: Record<string, unknown>) {
    const result = await client
      .from("volei_web_push_outbox")
      .update(changes)
      .eq("id", job.id)
      .eq("claimed_at", job.claimed_at);
    if (result.error) throw Error("Falha ao atualizar fila.");
  }
  // Bounded concurrency keeps 20 slow endpoints within the route's time budget.
  for (let offset = 0; offset < jobs.length; offset += 5) {
    await Promise.all(
      jobs.slice(offset, offset + 5).map(async (job) => {
        const subscription = await client
          .from("volei_web_push_subscriptions")
          .select("id,user_id,endpoint,p256dh,auth,expires_at")
          .eq("id", job.subscription_id)
          .maybeSingle();
        if (subscription.error) throw Error("Falha ao consultar navegador.");
        const row = subscription.data;
        if (!row) return;
        const admin = await client
          .from("volei_admins")
          .select("user_id")
          .eq("user_id", row.user_id)
          .maybeSingle();
        if (admin.error) throw Error("Falha ao verificar acesso.");
        if (!admin.data || Date.parse(row.expires_at) <= Date.now()) {
          await save(job, { status: "failed" });
          return;
        }
        try {
          await sendWebPush(row, {
            id: job.id,
            title: job.title,
            body: job.body,
            href: job.href,
          });
        } catch (cause) {
          const status = (cause as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            const removed = await client
              .from("volei_web_push_subscriptions")
              .delete()
              .eq("id", row.id);
            if (removed.error)
              throw Error("Falha ao remover navegador expirado.");
          } else
            await save(job, {
              status:
                (status && status >= 400 && status < 500 && status !== 429) ||
                job.attempts >= 5
                  ? "failed"
                  : "pending",
              next_attempt_at: new Date(
                Date.now() + 30000 * 2 ** job.attempts,
              ).toISOString(),
            });
          return;
        }
        await save(job, { status: "sent" });
        ++sent;
      }),
    );
  }
  const cleanup = await client
    .from("volei_web_push_outbox")
    .delete()
    .lt("created_at", new Date(Date.now() - 7 * 86400000).toISOString());
  if (cleanup.error) throw Error("Falha na limpeza da fila.");
  return { processed: jobs.length, sent };
}
