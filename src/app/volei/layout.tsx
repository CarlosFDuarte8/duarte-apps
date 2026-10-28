import { VoleiShell } from "@/components/volei/shell";
export const metadata = {
  title: "Quadra | Vôlei",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <VoleiShell>{children}</VoleiShell>;
}
