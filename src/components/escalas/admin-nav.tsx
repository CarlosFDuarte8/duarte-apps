"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Painel", exact: true },
  { href: "/admin/membros", label: "Membros" },
  { href: "/admin/escalas", label: "Escalas" },
  { href: "/admin/regras", label: "Regras" },
];

export function AdminNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="sc-tabs" aria-label="Administração">
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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
