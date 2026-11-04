import { timingSafeEqual } from "node:crypto";
import { dispatchPush } from "@/lib/volei/push-dispatch";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const secret = process.env.VOLEI_PUSH_CRON_SECRET;
  if (
    process.env.VOLEI_PUSH_ENABLED !== "true" ||
    !secret ||
    secret.length < 32
  )
    return Response.json(
      { error: "Push não ativado." },
      { status: 503, headers },
    );
  const expected = Buffer.from(`Bearer ${secret}`),
    actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return Response.json(
      { error: "Acesso restrito." },
      { status: 401, headers },
    );
  try {
    return Response.json(await dispatchPush(), { headers });
  } catch {
    return Response.json(
      { error: "Não foi possível processar a fila." },
      { status: 503, headers },
    );
  }
}
