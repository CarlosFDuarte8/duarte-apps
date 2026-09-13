import Link from "next/link";
import { Brand } from "../ui/brand";

export function SiteFooter() {
  return (<footer className="footer shell"><Brand /><p>Projetado com intenção. Construído com código.</p><span>© 2026 Carlos Duarte</span><Link href="/nutrigo/privacy-policy">Privacidade do NutriGo</Link></footer>);
}
