import Link from "next/link";
import { VolleyLogo } from "./logo";

export function VolleyBrand({ admin = false, mobile = false }: { admin?: boolean; mobile?: boolean }) {
  return (
    <Link
      href={admin ? "/admin/volei" : "/volei"}
      className={mobile ? "volley-mobile-brand" : "volley-brand"}
      aria-label={`Privaty Volleyball — ${admin ? "painel administrativo" : "jogos e presenças"}`}
    >
      <VolleyLogo />
    </Link>
  );
}
