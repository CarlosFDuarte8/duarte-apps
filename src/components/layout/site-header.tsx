import Link from "next/link";
import { Brand } from "../ui/brand";
import { ArrowIcon } from "../ui/icons";

export function SiteHeader() {
  return (<header className="nav shell">
        <Brand />
        <nav aria-label="Navegação principal">
          <Link href="/#sobre">Sobre</Link>
          <Link href="/#projetos">Projetos</Link>
          <Link href="/#experiencia">Experiência</Link>
        </nav>
        <Link className="nav-cta" href="/#contato">Vamos conversar <ArrowIcon /></Link>
      </header>);
}
