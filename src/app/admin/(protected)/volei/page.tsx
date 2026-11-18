import { requireVoleiAdmin } from "@/lib/volei/auth";
import { EventCreator } from "@/components/volei/event-creator";
import { VolleyDashboard } from "@/components/volei/dashboard";
import { listEvents } from "@/lib/volei/repository";
import { currentMonth, monthPattern } from "@/lib/volei/domain";
import { todayTasks } from "@/lib/volei/today-tasks";
import { TodayTasks } from "@/components/volei/today-tasks";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const month = mes && monthPattern.test(mes) ? mes : currentMonth();
  const { client } = await requireVoleiAdmin();
  const [items, tasks] = await Promise.all([listEvents(client, month), todayTasks(client)]);
  return (
    <VolleyDashboard
      items={items}
      admin
      month={month}
      tasks={<TodayTasks data={tasks} />}
      creator={<EventCreator month={month} />}
    />
  );
}
