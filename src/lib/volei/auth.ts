import "server-only";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/escalas/supabase";
export async function requireVoleiAdmin() {
  const session = await requireAdmin();
  const { data, error } = await session.client.rpc("is_volei_admin");
  if (error || !data) redirect("/admin/login?denied=1");
  return session;
}
