import Link from "next/link";
import { snapshot } from "@/lib/escalas/repository";
import { categories } from "@/lib/escalas/domain";
import { PageHeader } from "@/components/escalas/admin-ui";
import { CATEGORY_NAMES } from "@/lib/escalas/names";

const columns = ["nome", "categoria", "status"] as const;
type Column = (typeof columns)[number];
const sortOptions: { value: string; label: string }[] = [
  { value: "nome-asc", label: "Nome (A–Z)" },
  { value: "nome-desc", label: "Nome (Z–A)" },
  { value: "categoria-asc", label: "Categoria (A–Z)" },
  { value: "categoria-desc", label: "Categoria (Z–A)" },
  { value: "status-asc", label: "Ativos primeiro" },
  { value: "status-desc", label: "Inativos primeiro" },
];

function SortHeader({
  label,
  href,
  direction,
}: {
  label: string;
  href: string;
  direction?: "asc" | "desc";
}) {
  return (
    <th
      aria-sort={
        direction === "asc"
          ? "ascending"
          : direction === "desc"
            ? "descending"
            : "none"
      }
    >
      <Link className="sc-sort" data-dir={direction} href={href}>
        {label}
        <span className="sc-sort-icon" aria-hidden="true">
          <svg viewBox="0 0 10 14">
            <path className="up" d="M5 1 9 5H1z" />
            <path className="down" d="M5 13 1 9h8z" />
          </svg>
        </span>
      </Link>
    </th>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    nome?: string;
    categoria?: string;
    status?: string;
    ordenar?: string;
  }>;
}) {
  const state = await snapshot();
  const query = await searchParams;
  const [rawColumn, rawDirection] = (query.ordenar ?? "nome-asc").split("-");
  const column: Column = columns.includes(rawColumn as Column)
    ? (rawColumn as Column)
    : "nome";
  const direction: "asc" | "desc" = rawDirection === "desc" ? "desc" : "asc";
  const sortValue = `${column}-${direction}`;
  const members = state.members
    .filter(
      (m) =>
        (!query.nome ||
          m.name
            .toLocaleLowerCase("pt-BR")
            .includes(query.nome.toLocaleLowerCase("pt-BR"))) &&
        (!query.categoria || m.category === query.categoria) &&
        (!query.status || m.is_active === (query.status === "ativo")),
    )
    .sort((a, b) => {
      const byName = a.name.localeCompare(b.name, "pt-BR");
      const result =
        column === "categoria"
          ? CATEGORY_NAMES[a.category].localeCompare(
              CATEGORY_NAMES[b.category],
              "pt-BR",
            )
          : column === "status"
            ? Number(b.is_active) - Number(a.is_active)
            : byName;
      return (direction === "asc" ? result : -result) || byName;
    });
  const hasFilters = Boolean(query.nome || query.categoria || query.status);
  // Clicar na coluna ativa inverte a direção; os filtros atuais são preservados.
  const sortHref = (target: Column) => {
    const params = new URLSearchParams();
    if (query.nome) params.set("nome", query.nome);
    if (query.categoria) params.set("categoria", query.categoria);
    if (query.status) params.set("status", query.status);
    params.set(
      "ordenar",
      `${target}-${column === target && direction === "asc" ? "desc" : "asc"}`,
    );
    return `?${params}`;
  };
  return (
    <>
      <PageHeader
        eyebrow="Cadastro"
        title="Membros"
        description={`${members.length} ${members.length === 1 ? "membro encontrado" : "membros encontrados"}`}
        actions={
          <Link className="sc-button" href="/admin/membros/novo">
            Cadastrar membro
          </Link>
        }
      />
      <form className="sc-panel sc-member-filters">
        <label className="sc-field sc-search">
          <span>Nome</span>
          <input
            name="nome"
            type="search"
            placeholder="Buscar pelo nome"
            defaultValue={query.nome}
          />
        </label>
        <label className="sc-field">
          <span>Categoria</span>
          <select name="categoria" defaultValue={query.categoria}>
            <option value="">Todas</option>
            {[...categories]
              .sort((a, b) =>
                CATEGORY_NAMES[a].localeCompare(CATEGORY_NAMES[b], "pt-BR"),
              )
              .map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_NAMES[c]}
                </option>
              ))}
          </select>
        </label>
        <label className="sc-field">
          <span>Status</span>
          <select name="status" defaultValue={query.status}>
            <option value="">Todos</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </label>
        <label className="sc-field sc-sort-field">
          <span>Ordenar por</span>
          <select name="ordenar" defaultValue={sortValue}>
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="sc-panel-actions">
          <button className="sc-btn">Filtrar</button>
          {hasFilters && (
            <Link className="sc-button sc-btn-link" href="/admin/membros">
              Limpar
            </Link>
          )}
        </div>
      </form>
      {members.length ? (
        <div className="sc-scroll">
          <table className="sc-table sc-table-compact">
            <thead>
              <tr>
                <SortHeader
                  label="Nome"
                  href={sortHref("nome")}
                  direction={column === "nome" ? direction : undefined}
                />
                <SortHeader
                  label="Categoria"
                  href={sortHref("categoria")}
                  direction={column === "categoria" ? direction : undefined}
                />
                <SortHeader
                  label="Status"
                  href={sortHref("status")}
                  direction={column === "status" ? direction : undefined}
                />
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td data-label="Nome">
                    <Link
                      className="sc-row-title"
                      href={`/admin/membros/${m.id}`}
                    >
                      {m.name}
                    </Link>
                  </td>
                  <td data-label="Categoria">
                    <span className={`sc-cat sc-${m.category}`}>
                      <i aria-hidden="true" />
                      {CATEGORY_NAMES[m.category]}
                    </span>
                  </td>
                  <td data-label="Status">
                    <span
                      className={`sc-badge ${m.is_active ? "sc-badge-ok" : "sc-badge-muted"}`}
                    >
                      {m.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td data-label="Ação">
                    <Link href={`/admin/membros/${m.id}`}>
                      Editar e ver histórico
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="sc-card sc-notice">
          <strong>Nenhum membro encontrado.</strong>
          <p>Ajuste os filtros ou cadastre um novo membro.</p>
        </div>
      )}
    </>
  );
}
