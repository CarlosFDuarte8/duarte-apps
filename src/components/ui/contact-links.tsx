import { site } from "@/data/site";
import { ArrowIcon } from "./icons";
import { ContactIcon, type ContactIconName } from "./contact-icon";

export function ContactLinks() {
  const contacts: { icon: ContactIconName; label: string; href: string; primary?: boolean }[] = [
    {
      icon: "whatsapp",
      label: "Conversar no WhatsApp",
      href: site.contactWhatsApp,
      primary: true,
    },
    { icon: "linkedin", label: "LinkedIn", href: site.contactLinkedIn },
    { icon: "github", label: "GitHub", href: site.contactGitHub },
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
          <ContactIcon name={link.icon} /> {link.label} <ArrowIcon />
        </a>
      ))}
      {site.contactEmail && (
        <a
          className="button button-social"
          href={`mailto:${site.contactEmail}`}
        >
          <ContactIcon name="email" /> Enviar e-mail <ArrowIcon />
        </a>
      )}
    </div>
  );
}
