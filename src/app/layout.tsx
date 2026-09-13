import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./refinements.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MobileNavigation } from "@/components/layout/mobile-navigation";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Carlos Duarte | Desenvolvedor Full Stack",
  description: "Projetos mobile e web de Carlos Duarte. Conheça minha trajetória, tecnologias e o aplicativo NutriGo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><SiteHeader />{children}<SiteFooter /><MobileNavigation /></body>
    </html>
  );
}
