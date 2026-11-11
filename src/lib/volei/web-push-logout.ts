import "server-only";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceClient } from "@/lib/escalas/supabase";
export async function unregisterBrowserOnLogout(client: SupabaseClient) {
  const jar = await cookies();
  const id = jar.get("volei-web-push-id")?.value;
  if (!id) return;
  try {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (user && /^[0-9a-f-]{36}$/i.test(id)) {
      const result = await serviceClient()
        .from("volei_web_push_subscriptions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (result.error)
        throw Error(
          "Não foi possível desligar os avisos deste navegador. Desative-os no sino antes de sair.",
        );
    }
    jar.delete("volei-web-push-id");
  } catch {
    // Keep the cookie for a later retry. Signing out must still work if offline.
  }
}
