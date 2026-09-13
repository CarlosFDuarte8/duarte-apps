export function TagList({ items, className = "tags" }: { items: string[]; className?: string }) {
  return <div className={className}>{items.map((item) => <span key={item}>{item}</span>)}</div>;
}
