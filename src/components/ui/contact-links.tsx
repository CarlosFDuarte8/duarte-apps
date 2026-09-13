import { site } from "@/data/site";
import { ArrowIcon } from "./icons";

export function ContactLinks() {
  const contacts: { label: string; href: string; primary?: boolean }[] = [
    {
      label: "Conversar no WhatsApp",
      href: site.contactWhatsApp,
      primary: true,
    },
    { label: "LinkedIn", href: site.contactLinkedIn },
    { label: "GitHub", href: site.contactGitHub },
  ];
  const links = contacts.filter((link) => link.href);

  return (
    <div className="contact-actions">
      {links.map((link) => (
        <a
          key={link.label}
          className={`button ${link.primary ? "button-whatsapp" : "button-social"}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {link.label} <ArrowIcon />
        </a>
      ))}
      {site.contactEmail && (
        <a
          className="button button-social"
          href={`mailto:${site.contactEmail}`}
        >
          Enviar e-mail <ArrowIcon />
        </a>
      )}
    </div>
  );
}
