export function participationTime(
  status: string,
  registeredAt?: string | null,
  confirmedAt?: string | null,
): { dateTime: string; label: string } | null {
  const confirmed = status === "confirmado" && Boolean(confirmedAt);
  const value = confirmed ? confirmedAt : registeredAt;
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
  return {
    dateTime: value,
    label: `${confirmed ? "Confirmado" : "Inscrito"} em ${formatted}`,
  };
}
