import Link from "next/link";
import { Brand } from "../ui/brand";
import { navigationItems } from "@/data/navigation";

const projectLinks = [
  { href: "/escalas", label: "Escalas da congregação" },
  { href: "/nutrigo/privacy-policy", label: "Privacidade do NutriGo" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer-inner">
        <div className="site-footer-about">
          <Brand />
          <p>Projetado com intenção. Construído com código.</p>
        </div>
        <nav aria-label="Seções do site">
          <h2>Navegação</h2>
          <ul>
            {navigationItems
              .filter((item) => item.id !== "inicio")
              .map((item) => (
                <li key={item.id}>
                  <Link href={`/#${item.id}`}>{item.label}</Link>
                </li>
              ))}
          </ul>
        </nav>
        <nav aria-label="Projetos e documentos">
          <h2>Projetos</h2>
          <ul>
            {projectLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="site-footer-bottom">
        <div className="shell">
          <span>© {new Date().getFullYear()} Carlos Duarte. Todos os direitos reservados.</span>
        </div>
      </div>
    </footer>
  );
}
