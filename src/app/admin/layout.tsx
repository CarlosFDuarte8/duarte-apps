import "@/components/escalas/escalas.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Administração | CCB INCRA-08",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <main className="sc">{children}</main>;
}
