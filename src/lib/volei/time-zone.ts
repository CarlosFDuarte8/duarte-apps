/** Use the zone's offset on that date, including historical daylight saving. */
export function brasiliaDateTime(date: string, time: string) {
  const local = `${date}T${time}:00`;
  const zone = new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", timeZoneName: "longOffset" })
    .formatToParts(new Date(`${local}Z`)).find(part => part.type === "timeZoneName")!.value;
  return `${local}${zone.replace("GMT", "") || "+00:00"}`;
}
