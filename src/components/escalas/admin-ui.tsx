import type { ReactNode } from "react";
import { weekday, type Category } from "@/lib/escalas/domain";

export const CATEGORY_NAMES: Record<Category, string> = {
  porteiro: "Porteiro",
  porteira: "Porteira",
  organista: "Organista",
};

export const KIND_NAMES: Record<string, string> = {
  culto: "Culto oficial",
  jovens: "Jovens e menores",
  ensaio: "Ensaio local",
};

export const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const monthFormat = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const shortMonthFormat = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: "UTC",
});

export function monthLabel(month: string) {
  const text = monthFormat.format(new Date(`${month}-01T12:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function shortMonthLabel(month: string) {
  const name = shortMonthFormat
    .format(new Date(`${month}-01T12:00:00Z`))
    .replace(".", "");
  return `${name}/${month.slice(0, 4)}`;
}

export function dayLabel(date: string) {
  const [, m, d] = date.split("-");
  return `${WEEKDAY_NAMES[weekday(date)]}, ${d}/${m}`;
}

export function StatusBadge({ status }: { status: "draft" | "published" }) {
  return (
    <span className={`sc-badge ${status === "draft" ? "sc-badge-draft" : "sc-badge-ok"}`}>
      {status === "draft" ? "Rascunho" : "Publicado"}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="sc-page-head">
      <div>
        {eyebrow && <p className="sc-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="sc-page-desc">{description}</p>}
      </div>
      {actions && <div className="sc-page-actions">{actions}</div>}
    </header>
  );
}
