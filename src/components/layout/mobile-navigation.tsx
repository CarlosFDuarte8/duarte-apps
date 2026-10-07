"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navigationItems } from "@/data/navigation";
import { NavigationIcon } from "../ui/icons";
import "./mobile-navigation.css";

export function MobileNavigation() {
  const pathname = usePathname();
  const [active, setActive] = useState<{ pathname: string; id: string | null }>({
    pathname: "/",
    id: "inicio",
  });
  const isAdmin =
    (pathname ?? "").startsWith("/admin") ||
    (pathname ?? "").startsWith("/escalas");

  useEffect(() => {
    if (pathname !== "/") return;

    let frame = 0;

    const updateActiveSection = () => {
      frame = 0;

      // Follow a reading line near the top, even inside very tall sections.
      const readingLine = window.innerHeight * 0.3;
      let id: string | null = "inicio";
      for (const item of navigationItems) {
        const section = document.getElementById(item.id);
        if (section && section.getBoundingClientRect().top <= readingLine) {
          id = item.id;
        }
      }

      setActive((previous) => previous.pathname === pathname && previous.id === id
        ? previous
        : { pathname, id });
    };

    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveSection);
    };

    scheduleUpdate();
    // Capture also catches scrolling on body/other containers, not just window.
    document.addEventListener("scroll", scheduleUpdate, { passive: true, capture: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", scheduleUpdate);
    window.addEventListener("pageshow", scheduleUpdate);
    const observer = new IntersectionObserver(scheduleUpdate, {
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
    });
    for (const item of navigationItems) {
      const section = document.getElementById(item.id);
      if (section) observer.observe(section);
    }
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", scheduleUpdate);
      window.removeEventListener("pageshow", scheduleUpdate);
    };
  }, [pathname]);

  if (isAdmin) return null;

  return (
    <nav className="mobile-navigation" aria-label="Navegação principal no celular">
      {navigationItems.map((item) => (
        <Link
          key={item.id}
          href={`/#${item.id}`}
          onClick={(event) => {
            if (pathname === "/" && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
              setActive({ pathname, id: item.id });
            }
          }}
          aria-current={pathname === "/" && active.pathname === pathname && active.id === item.id ? "location" : undefined}
        >
          <span className="mobile-navigation-icon"><NavigationIcon name={item.icon} /></span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
