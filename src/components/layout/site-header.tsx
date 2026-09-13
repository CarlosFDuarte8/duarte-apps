import Link from "next/link";
import { Brand } from "../ui/brand";
import { ArrowIcon } from "../ui/icons";
import { navigationItems } from "@/data/navigation";

export function SiteHeader() {
  return (<header className="nav shell" id="inicio">
        <Brand />
        <nav aria-label="Navegação principal">
          {navigationItems.filter((item) => item.id !== "inicio").map((item) => (
            <Link key={item.id} href={`/#${item.id}`}>{item.label}</Link>
          ))}
        </nav>
        <Link className="nav-cta" href="/#contato">Vamos conversar <ArrowIcon /></Link>
      </header>);
}
