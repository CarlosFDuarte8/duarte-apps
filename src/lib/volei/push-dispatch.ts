import "server-only";
import { serviceClient } from "@/lib/escalas/supabase";
type Job = { id: string; token: string; attempts: number };
type Ticket = {
  status: "ok" | "error";
  id?: string;
  details?: { error?: string };
};
const expoBase = "https://exp.host/--/api/v2/push";
async function expoRequest(path: string, payload: unknown) {
  const response = await fetch(`${expoBase}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.EXPO_ACCESS_TOKEN
        ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error("Push service unavailable");
  return await response.json();
}
export async function dispatchPush() {
  const client = serviceClient();
  const claimed = await client.rpc("volei_claim_push", { p_limit: 100 });
  if (claimed.error) throw Error("Push queue unavailable");
  const jobs = (claimed.data ?? []) as Job[];
  async function save(id: string, changes: Record<string, unknown>) {
    const result = await client
      .from("volei_push_outbox")
      .update(changes)
      .eq("id", id);
    if (result.error) throw Error("Push queue update failed");
  }
  if (jobs.length) {
    let tickets: Ticket[] | undefined;
    try {
      const result = await expoRequest(
        "send",
        jobs.map((job) => ({
          to: job.token,
          title: "Quadra",
          body: "Há novas solicitações para acompanhar no grupo.",
          sound: "default",
          channelId: "volei-admin",
          data: { kind: "volei_requests" },
        })),
      );
      if (!Array.isArray(result.data) || result.data.length !== jobs.length)
        throw Error("Invalid push response");
      tickets = result.data as Ticket[];
    } catch {
      /* A bounded retry handles transient/ambiguous push failures. */
    }
    for (const [index, job] of jobs.entries()) {
      const ticket = tickets?.[index];
      if (ticket?.status === "ok" && typeof ticket.id === "string")
        await save(job.id, { status: "sent", ticket_id: ticket.id });
      else if (ticket?.details?.error === "DeviceNotRegistered") {
        const removed = await client
          .from("volei_push_devices")
          .delete()
          .eq("token", job.token);
        if (removed.error) throw Error("Push device cleanup failed");
      } else
        await save(job.id, {
          status: job.attempts >= 5 ? "failed" : "pending",
          next_attempt_at: new Date(
            Date.now() + Math.min(3600, 30 * 2 ** job.attempts) * 1000,
          ).toISOString(),
        });
    }
  }
  const now = Date.now();
  const awaiting = await client
    .from("volei_push_outbox")
    .select("id,token,ticket_id")
    .eq("status", "sent")
    .is("receipt_checked_at", null)
    .not("ticket_id", "is", null)
    .lte("created_at", new Date(now - 15 * 60000).toISOString())
    .gte("created_at", new Date(now - 24 * 3600000).toISOString())
    .order("created_at")
    .limit(100);
  if (awaiting.error) throw Error("Push receipts unavailable");
  const receipts = awaiting.data ?? [];
  if (receipts.length) {
    const result = await expoRequest("getReceipts", {
      ids: receipts.map((row) => row.ticket_id),
    });
    if (!result.data || typeof result.data !== "object")
      throw Error("Invalid receipts");
    for (const row of receipts) {
      const receipt = result.data[row.ticket_id] as Ticket | undefined;
      if (!receipt || !["ok", "error"].includes(receipt.status)) continue;
      if (receipt.details?.error === "DeviceNotRegistered") {
        const removed = await client
          .from("volei_push_devices")
          .delete()
          .eq("token", row.token);
        if (removed.error) throw Error("Push device cleanup failed");
      } else
        await save(row.id, {
          receipt_checked_at: new Date().toISOString(),
          ...(receipt.status === "error" ? { status: "failed" } : {}),
        });
    }
  }
  const cleanup = await client
    .from("volei_push_outbox")
    .delete()
    .lt("created_at", new Date(now - 7 * 86400000).toISOString());
  if (cleanup.error) throw Error("Push queue cleanup failed");
  return { processed: jobs.length, receipts: receipts.length };
}
