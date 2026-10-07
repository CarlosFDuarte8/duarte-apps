import { PageSkeleton } from "@/components/escalas/skeletons";

// Troca de página dentro da administração: a barra lateral continua e só o conteúdo vira esqueleto.
export default function Loading() {
  return <PageSkeleton />;
}
