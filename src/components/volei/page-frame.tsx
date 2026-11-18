import type { ComponentProps, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import styles from "./page-frame.module.css";

export function VolleyPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main id="volley-main" tabIndex={-1} data-slot="volley-page" className={cn(styles.page, "volley-content", className)}>
      <svg className={styles.court} aria-hidden="true" viewBox="0 0 1450 1100" preserveAspectRatio="xMidYMax slice" fill="none">
        <path d="M-220 490C210 490 490 630 835 850M-80 1010C220 670 670 550 1510 760M1110 1200C1210 850 1435 655 1610 530M850 1200C990 700 1250 420 1540 320M1020 745H1550" />
      </svg>
      {children}
    </main>
  );
}

export function VolleyHero({
  id,
  eyebrow,
  title,
  description,
  compact = false,
  mobileCompact = false,
  underline = false,
  actions,
  aside,
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  compact?: boolean;
  mobileCompact?: boolean;
  underline?: boolean;
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section data-slot="volley-hero" data-mobile-compact={mobileCompact || undefined} className={cn(styles.hero, compact && styles.compact, aside && styles.withAside)} aria-labelledby={id}>
      <div className={styles.heroCopy}>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        <h1 id={id} className={cn(styles.heroTitle, underline && styles.underlined)}>{title}</h1>
        {description && <div className={styles.heroDescription}>{description}</div>}
        {actions && <div className={styles.heroActions}>{actions}</div>}
      </div>
      {aside && <aside className={styles.heroAside}>{aside}</aside>}
    </section>
  );
}

export function VolleyCard({ className, ...props }: ComponentProps<typeof Card>) {
  return <Card className={cn(styles.card, "volley-surface", className)} {...props} />;
}

export function VolleyFormCard({ className, ...props }: ComponentProps<"form">) {
  return <form data-slot="card" className={cn(styles.card, "volley-surface", className)} {...props} />;
}

export function VolleyPageHeader(props: ComponentProps<typeof VolleyHero>) {
  return <VolleyHero compact {...props} />;
}

export function VolleyHeroDetail({ status, active, label, value, description, detail }: {
  status: string;
  active: boolean;
  label: string;
  value: ReactNode;
  description?: string;
  detail?: ReactNode;
}) {
  return <div data-slot="volley-hero-detail" className={styles.heroDetail}>
    <span className={styles.heroStatus} data-active={active}>{status}</span>
    <p>{label}</p>
    <strong>{value}</strong>
    {description && <small>{description}</small>}
    {detail && <span>{detail}</span>}
  </div>;
}

export function VolleySectionHeader({ title, description, eyebrow, icon, actions }: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return <header className={styles.sectionHeader}>
    {icon && <span className={styles.sectionIcon} aria-hidden="true">{icon}</span>}
    <div className={styles.sectionCopy}>
      {eyebrow && <span className={styles.sectionEyebrow}>{eyebrow}</span>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
    {actions && <div className={styles.sectionActions}>{actions}</div>}
  </header>;
}
