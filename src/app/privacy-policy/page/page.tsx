import { permanentRedirect } from "next/navigation";

export default function LegacyPrivacyPolicyRedirect() {
  permanentRedirect("/nutrigo/privacy-policy");
}
