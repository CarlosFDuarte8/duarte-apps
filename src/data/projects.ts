import type { StaticImageData } from "next/image";

export type Project = {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  stack: string[];
  tone: 'blue' | 'violet' | 'green';
  privacyPolicyHref?: string;
  links?: { label: string; href: string }[];
  image?: StaticImageData;
};

import nutrigoBanner from "@/assets/banners/nutrigo-google-play-feature-graphic.png";

export const projects: Project[] = [
  {
    number: "01",
    eyebrow: "Saúde digital • Mobile",
    title: "Noar Health",
    description:
      "Aplicativo mobile para acompanhamento de pacientes, questionários inteligentes, notificações e experiências conectadas a dispositivos.",
    stack: ["React Native", ".NET", "SQL Server", "BLE"],
    tone: "blue",
    links: [
      {
        label: "Android",
        href: "https://play.google.com/store/search?q=noar+health&c=apps&hl=pt&gl=US"
      },
      {
        label: "iOS",
        href: "https://apps.apple.com/br/app/noar-health/id1673473276?l=en-GB"
      }]
  },
  {
    number: "02",
    eyebrow: "Inteligência artificial • Web",
    title: "Transcritor com IA",
    description:
      "Plataforma de transcrição de áudio e vídeo com identificação de locutores, processamento robusto e integração entre API e front-end.",
    stack: ["WhisperX", "FastAPI", "Python", "Next.js"],
    tone: "violet",
  },
  {
    number: "03",
    eyebrow: "Produto SaaS • Full Stack",
    title: "Gestão para clínicas",
    description:
      "Sistema completo para organizar atendimentos, profissionais e rotinas clínicas, construído com arquitetura moderna e infraestrutura em nuvem.",
    stack: ["Java", "Spring Boot", "Next.js", "PostgreSQL"],
    tone: "green",
  },
  {
    number: "04",
    eyebrow: "Alimentação e bem-estar • Mobile",
    title: "NutriGo",
    description: "Aplicativo para organizar refeições, planejar a semana e acompanhar hábitos alimentares, com lista de compras e assistente de inteligência artificial.",
    stack: ["React Native", "Planejamento alimentar", "Assistente com IA", "Mobile"],
    tone: "green",
    privacyPolicyHref: "/nutrigo/privacy-policy",
    image: nutrigoBanner,
  },
];
