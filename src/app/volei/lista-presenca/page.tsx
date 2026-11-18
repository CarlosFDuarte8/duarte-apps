import { publicWhatsAppGroup } from "@/lib/volei/group-settings";
import { LocalAttendance } from "./attendance";

export default async function Page() {
  return <LocalAttendance group={await publicWhatsAppGroup()} />;
}
