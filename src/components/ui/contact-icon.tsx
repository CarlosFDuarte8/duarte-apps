export type ContactIconName = "whatsapp" | "linkedin" | "github" | "email";

export function ContactIcon({ name }: { name: ContactIconName }) {
  const icons = {
    whatsapp: <><path d="M20.5 11.8a8.5 8.5 0 0 1-12.6 7.5L3 20.7l1.4-4.8a8.5 8.5 0 1 1 16.1-4.1Z" /><path d="m8.1 7.4 1.4-.2 1.1 2.5-1 1.1a8.1 8.1 0 0 0 3.6 3.6l1.1-1 2.5 1.1-.2 1.4c-.2 1-1.3 1.4-2.2 1.1-4-1.2-6.8-4-8-8-.3-.9.1-2 1.1-2.2Z" /></>,
    linkedin: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7.5 10v7M11.5 17v-7m0 3a3 3 0 0 1 6 0v4" /><circle cx="7.5" cy="7" r=".8" fill="currentColor" stroke="none" /></>,
    github: <><path d="M9 19c-4.3 1.3-4.3-2.2-6-2.7m12 5v-3.4a3 3 0 0 0-.8-2.3c2.7-.3 5.6-1.3 5.6-6a4.7 4.7 0 0 0-1.3-3.3 4.3 4.3 0 0 0-.1-3.3s-1-.3-3.4 1.3a11.5 11.5 0 0 0-6 0C6.6 2.7 5.6 3 5.6 3a4.3 4.3 0 0 0-.1 3.3A4.7 4.7 0 0 0 4.2 9.6c0 4.7 2.9 5.7 5.6 6A3 3 0 0 0 9 17.9v3.4" /></>,
    email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  };

  return (
    <svg className="contact-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {icons[name]}
    </svg>
  );
}
