import type { ReactNode } from "react";

export function SectionLabel({ number, children }: { number: string; children: ReactNode }) {
  return <div className="section-label"><span>{number}</span>{children}</div>;
}
