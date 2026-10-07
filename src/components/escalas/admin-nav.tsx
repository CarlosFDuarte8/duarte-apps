"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon, type NavIconName } from "./nav-icons";

const items: {
  href: string;
  label: string;
  icon: NavIconName;
  exact?: boolean;
}[] = [
  { href: "/admin", label: "Painel", icon: "dashboard", exact: true },
  { href: "/admin/membros", label: "Membros", icon: "members" },
  { href: "/admin/escalas", label: "Escalas", icon: "calendar" },
  { href: "/admin/regras", label: "Regras", icon: "rules" },
];

// "side" é a barra lateral (desktop); "bottom" é a barra de abas inferior (celular).
export function AdminNav({ variant }: { variant: "side" | "bottom" }) {
  const pathname = usePathname() ?? "";
  return (
    <nav
      className={variant === "side" ? "sc-sidenav" : "sc-bottomnav"}
      style={variant === "bottom" ? { ["--n" as string]: items.length } : undefined}
      aria-label="Administração"
    >
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
          >
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
