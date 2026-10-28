import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Painel do vôlei | Quadra",
  description: "Gestão de membros, jogos e inscrições do grupo de vôlei.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
