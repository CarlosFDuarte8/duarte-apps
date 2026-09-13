export type Project = {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  stack: string[];
  tone: 'blue' | 'violet' | 'green';
  privacyPolicyHref?: string;
};

export const projects: Project[] = [
  {
    number: "01",
    eyebrow: "Saúde digital • Mobile",
    title: "Noar Health",
    description:
      "Aplicativo mobile para acompanhamento de pacientes, questionários inteligentes, notificações e experiências conectadas a dispositivos.",
    stack: ["React Native", ".NET", "SQL Server", "BLE"],
    tone: "blue",
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
  },
];
