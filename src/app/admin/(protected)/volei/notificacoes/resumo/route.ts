import { sessionClient } from "@/lib/escalas/supabase";
import { notificationSummary } from "@/lib/volei/complaint-repository";
export const dynamic = "force-dynamic";
export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const client = await sessionClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user)
      return Response.json(
        { error: "Acesso necessário." },
        { status: 401, headers },
      );
    const owner = await client.rpc("is_volei_admin");
    if (owner.error || !owner.data)
      return Response.json(
        { error: "Acesso restrito." },
        { status: 403, headers },
      );
    return Response.json(await notificationSummary(client), { headers });
  } catch {
    return Response.json(
      { error: "Não foi possível atualizar as notificações." },
      { status: 503, headers },
    );
  }
}
