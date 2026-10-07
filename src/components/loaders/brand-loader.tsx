import type { ReactNode } from "react";
import "./loaders.css";

const calendarIcon = (
  <svg className="sc-loader-cal" viewBox="0 0 24 24">
    <rect x="4" y="5" width="16" height="16" rx="3" />
    <path d="M8 3v4m8-4v4M4 10h16" />
    <path className="sc-loader-check" d="m8 15.5 2.2 2.2L15.5 12" />
  </svg>
);

/** Carregamento de tela cheia: anel girando em volta de um ícone, com a semana pulsando abaixo. */
export function BrandLoader({
  label,
  icon = calendarIcon,
}: {
  label: string;
  icon?: ReactNode;
}) {
  return (
    <div className="sc-loader" role="status" aria-live="polite">
      <div className="sc-loader-mark" aria-hidden="true">
        <svg className="sc-loader-ring" viewBox="0 0 80 80">
          <circle className="track" cx="40" cy="40" r="36" />
          <circle className="arc" cx="40" cy="40" r="36" />
        </svg>
        {icon}
      </div>
      <div className="sc-loader-week" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <p className="sc-loader-label">{label}</p>
    </div>
  );
}
