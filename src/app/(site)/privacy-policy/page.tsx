import { permanentRedirect } from "next/navigation";

export default function PrivacyPolicyRedirect() {
  permanentRedirect("/nutrigo/privacy-policy");
}
