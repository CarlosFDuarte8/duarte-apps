"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

// Escalas e admin têm navegação própria, então o cabeçalho e o rodapé do portfólio ficam ocultos.
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const ownNav = pathname.startsWith("/admin") || pathname.startsWith("/escalas");
  return (
    <>
      {!ownNav && <SiteHeader />}
      {children}
      {!ownNav && <SiteFooter />}
    </>
  );
}
