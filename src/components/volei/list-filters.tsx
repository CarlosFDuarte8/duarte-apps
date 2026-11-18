"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";

type Filter = { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] };
export function VolleyListFilters({ search, onSearch, searchLabel = "Buscar participante por nome", filters = [], shown, total, active, onClear }: {
  search: string; onSearch: (value: string) => void; searchLabel?: string; filters?: Filter[];
  shown: number; total: number; active: boolean; onClear: () => void;
}) {
  const id = useId();
  return <div className="volley-list-filters">
    <div className="volley-filter-fields">
      <div className="volley-filter-field"><label htmlFor={`${id}-search`}>{searchLabel}</label><Input id={`${id}-search`} type="search" value={search} onChange={event => onSearch(event.target.value)} autoComplete="off" aria-describedby={`${id}-results`} /></div>
      {filters.map((filter, index) => <div key={filter.label} className="volley-filter-field"><label htmlFor={`${id}-${index}`}>{filter.label}</label><NativeSelect id={`${id}-${index}`} value={filter.value} onChange={event => filter.onChange(event.target.value)}>{filter.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect></div>)}
      <Button type="button" variant="outline" onClick={onClear} disabled={!active}>Limpar filtros</Button>
    </div>
    <p id={`${id}-results`} role="status" aria-live="polite">Exibindo {shown} de {total} participantes nesta lista.</p>
  </div>;
}
