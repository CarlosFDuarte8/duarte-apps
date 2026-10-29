import { VoleiHelp } from "@/components/volei/help";
import { requireVoleiAdmin } from "@/lib/volei/auth";

export const metadata = { title: "Ajuda do administrador | Quadra" };

export default async function Page() {
  await requireVoleiAdmin();
  return <VoleiHelp admin />;
}
