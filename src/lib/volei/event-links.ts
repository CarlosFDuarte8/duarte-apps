import type { VoleiEvent } from "./domain";
import { brasiliaDateTime } from "./time-zone";

export function eventStartTime(value: string) {
  const match = /^(\d{1,2})(?::([0-5]\d)|h([0-5]\d)?)?$/.exec(value.trim());
  if (!match || Number(match[1]) > 23) return null;
  return `${match[1].padStart(2, "0")}:${match[2] ?? match[3] ?? "00"}`;
}

function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/[,;]/g, "\\$&");
}

// RFC 5545: fold at 75 UTF-8 octets without splitting multibyte characters.
function fold(line: string) {
  let result = "", bytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 75) { result += "\r\n "; bytes = 1; }
    result += char;
    bytes += size;
  }
  return result;
}
const utc = (value: Date) => value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

export function eventCalendar(event: VoleiEvent, origin: string, now = new Date()) {
  const time = eventStartTime(event.start_time);
  const dateTime = brasiliaDateTime(event.date, time ?? "00:00");
  const description = [event.notes, `Horário informado: ${event.start_time || "a definir"} (Brasília).`,
    "Confirme o horário de término com a organização.", `${origin}/volei/jogo/${event.id}`].filter(Boolean).join("\n");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Privaty Volleyball//Agenda//PT-BR", "BEGIN:VEVENT",
    `UID:${event.id}@privaty-volleyball`, `DTSTAMP:${utc(now)}`,
    time ? `DTSTART:${utc(new Date(dateTime))}` : `DTSTART;VALUE=DATE:${event.date.replaceAll("-", "")}`,
    `SUMMARY:${escapeText(event.title)}`, `LOCATION:${escapeText(event.location)}`,
    `DESCRIPTION:${escapeText(description)}`, `URL:${origin}/volei/jogo/${event.id}`, "END:VEVENT", "END:VCALENDAR",
  ].map(fold).join("\r\n") + "\r\n";
}
