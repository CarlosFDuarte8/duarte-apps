import "./loaders.css";

/** Faixa de progresso fixa no topo da tela. */
export function TopProgress() {
  return <div className="sc-topbar" role="presentation" aria-hidden="true" />;
}

/** Bloco cinza com brilho; defina o tamanho por `w`/`h` ou por `className`. */
export function Skeleton({
  className = "",
  w,
  h,
}: {
  className?: string;
  w?: number | string;
  h?: number;
}) {
  return (
    <div
      className={`sc-skel ${className}`}
      style={{ width: w, maxWidth: "100%", height: h }}
    />
  );
}
