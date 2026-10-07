import { Skeleton, TopProgress } from "@/components/loaders";
import "./skeletons.css";

const repeat = (count: number) => Array.from({ length: count }, (_, i) => i);

/** Esqueleto de uma página da administração: cabeçalho, cartões de números e lista. */
export function PageSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Carregando">
      <TopProgress />
      <div className="sc-skel-head">
        <Skeleton w={90} h={12} />
        <Skeleton w={280} h={32} />
        <Skeleton w={420} h={14} />
      </div>
      <div className="sc-skel-stats">
        {repeat(4).map((i) => (
          <Skeleton key={i} h={92} />
        ))}
      </div>
      <div className="sc-skel-list">
        {repeat(4).map((i) => (
          <Skeleton key={i} h={72} />
        ))}
      </div>
    </div>
  );
}

/** Esqueleto da página pública: título, destaque do próximo evento, filtros e grade do mês. */
export function CalendarSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Carregando escala">
      <TopProgress />
      <Skeleton className="sc-skel-title" w={260} h={36} />
      <Skeleton className="sc-skel-hero" />
      <Skeleton h={72} />
      <div className="sc-skel-grid">
        {repeat(35).map((i) => (
          <Skeleton key={i} className="sc-skel-cell" />
        ))}
      </div>
    </div>
  );
}
