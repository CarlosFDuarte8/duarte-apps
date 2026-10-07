import { BrandLoader } from "@/components/loaders";

// Entrada na área pública (inclui o redirecionamento para o mês atual).
export default function Loading() {
  return <BrandLoader label="Carregando escalas…" />;
}
