import { BrandLoader } from "@/components/loaders";

// Entrada na administração: o shell ainda não montou, então o logotipo animado ocupa a tela.
export default function Loading() {
  return <BrandLoader label="Abrindo a administração…" />;
}
