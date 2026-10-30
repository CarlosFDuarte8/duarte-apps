import { requireVoleiAdmin } from "@/lib/volei/auth";
import { EventCreator } from "@/components/volei/event-creator";
import { VolleyDashboard } from "@/components/volei/dashboard";
import { listEvents } from "@/lib/volei/repository";
import { currentMonth, monthPattern } from "@/lib/volei/domain";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const month = mes && monthPattern.test(mes) ? mes : currentMonth();
  const { client } = await requireVoleiAdmin();
  const items = await listEvents(client, month);
  return (
    <VolleyDashboard
      items={items}
      admin
      month={month}
      creator={<EventCreator month={month} />}
    />
  );
}
