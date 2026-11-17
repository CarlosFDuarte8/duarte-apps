import type { AriaAttributes, ComponentProps, MouseEventHandler, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { VolleyCard } from "./page-frame";
import styles from "./metric.module.css";

type Props = AriaAttributes & {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: "blue" | "green" | "amber";
  className?: string;
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
};

export function VolleyMetrics({ className, columns = 4, ...props }: ComponentProps<"div"> & { columns?: 3 | 4 | 5 }) {
  return <div className={cn(styles.grid, className)} data-columns={columns} {...props} />;
}

export function VolleyMetric({ label, value, detail, icon, tone = "blue", className, href, onClick, ...aria }: Props) {
  const classes = cn(styles.metric, "volley-surface", "volley-metric", `vx-stat-${tone}`, className);
  const content = <>
    <div>{icon && <i aria-hidden="true">{icon}</i>}<span>{label}</span></div>
    <strong>{value}</strong>
    {detail && <p>{detail}</p>}
  </>;
  if (href) return <Link href={href} className={classes} {...aria}>{content}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={classes} {...aria}>{content}</button>;
  return <VolleyCard className={classes} {...aria}>{content}</VolleyCard>;
}
