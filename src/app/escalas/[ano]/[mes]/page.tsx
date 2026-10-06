import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { monthSchema, roleSchema, shiftMonth, today } from "@/lib/escalas/domain";
import { configured, sessionClient } from "@/lib/escalas/supabase";
import { PublicCalendar } from "@/components/escalas/calendar";

const eventsSchema = z.array(
  z.object({
    id: z.uuid(),
    date: z.iso.date(),
    kind: z.string(),
    notes: z.string(),
    assignments: z.array(z.object({ role: roleSchema, name: z.string() })),
  }),
);
export default async function Page({
  params,
}: {
  params: Promise<{ ano: string; mes: string }>;
}) {
  const { ano, mes } = await params;
  const month = `${ano}-${mes.padStart(2, "0")}`;
  if (!monthSchema.safeParse(month).success) notFound();
  if (!configured())
    return (
      <>
        <h1>Escalas da congregação</h1>
        <div className="sc-card sc-notice">
          <strong>Escalas ainda não disponíveis.</strong>
          <p>
            O calendário estará disponível após a configuração do serviço e a
            publicação das escalas.
          </p>
        </div>
      </>
    );
  const client = await sessionClient();
  const currentDate = today();
  const currentMonth = currentDate.slice(0, 7);
  // O destaque do próximo evento independe do mês exibido; falhas aqui não bloqueiam a página.
  const upcomingMonths = [currentMonth, shiftMonth(currentMonth, 1)];
  const [main, ...extra] = await Promise.all([
    client.rpc("published_schedule", { p_month: month }),
    ...upcomingMonths.map((m) =>
      m === month
        ? Promise.resolve(null)
        : client.rpc("published_schedule", { p_month: m }),
    ),
  ]);
  if (main.error)
    throw new Error("Não foi possível consultar as escalas publicadas.");
  const events = eventsSchema.parse(main.data);
  const upcoming = upcomingMonths
    .flatMap((m, i) => {
      if (m === month) return events;
      const parsed = eventsSchema.safeParse(extra[i]?.data);
      return parsed.success ? parsed.data : [];
    })
    .filter((e) => e.date >= currentDate);
  return (
    <>
      <h1>
        Escala de{" "}
        {new Intl.DateTimeFormat("pt-BR", {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${month}-01T12:00Z`))}
      </h1>
      <Suspense fallback={<p role="status">Carregando escala…</p>}>
        <PublicCalendar
          month={month}
          events={events}
          upcoming={upcoming}
          currentDate={currentDate}
        />
      </Suspense>
    </>
  );
}
