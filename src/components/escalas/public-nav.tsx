"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon, type NavIconName } from "./nav-icons";

const items: {
  href: string;
  label: string;
  short: string;
  icon: NavIconName;
  prefix?: boolean;
}[] = [
  { href: "/escalas", label: "Escalas", short: "Escalas", icon: "calendar", prefix: true },
//   { href: "/", label: "Portfólio", short: "Portfólio", icon: "home" },
  { href: "/admin", label: "Área administrativa", short: "Admin", icon: "shield" },
];

// "top" é a navegação do desktop; "bottom" é a barra de abas do celular.
export function PublicNav({ variant }: { variant: "top" | "bottom" }) {
  const pathname = usePathname() ?? "";
  return (
    <nav
      className={variant === "top" ? "sc-pubnav" : "sc-bottomnav"}
      style={variant === "bottom" ? { ["--n" as string]: items.length } : undefined}
      aria-label="Escalas"
    >
      {items.map((item) => {
        const active = item.prefix ? pathname.startsWith(item.href) : false;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
          >
            <NavIcon name={item.icon} />
            <span>{variant === "top" ? item.label : item.short}</span>
          </Link>
        );
      })}
    </nav>
  );
}
