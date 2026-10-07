import { redirect } from "next/navigation";
import { today } from "@/lib/escalas/domain";
export const dynamic = "force-dynamic";
export default function Page() {
  redirect(`/escalas/${today().slice(0, 7).replace("-", "/")}`); // Redireciona para a página da escala do mês atual
}
