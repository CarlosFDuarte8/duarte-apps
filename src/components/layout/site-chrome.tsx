"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

// Admin routes render their own nav/branding, so the marketing chrome is hidden there.
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const isAdmin = (usePathname() ?? "").startsWith("/admin");
  return (
    <>
      {!isAdmin && <SiteHeader />}
      {children}
      {!isAdmin && <SiteFooter />}
    </>
  );
}
