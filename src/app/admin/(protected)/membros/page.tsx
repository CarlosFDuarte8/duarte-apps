import Link from "next/link";
import { snapshot } from "@/lib/escalas/repository";
import { categories } from "@/lib/escalas/domain";
import { CATEGORY_NAMES, PageHeader } from "@/components/escalas/admin-ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ nome?: string; categoria?: string; status?: string }>;
}) {
  const state = await snapshot();
  const query = await searchParams;
  const members = state.members.filter(
    (m) =>
      (!query.nome ||
        m.name
          .toLocaleLowerCase("pt-BR")
          .includes(query.nome.toLocaleLowerCase("pt-BR"))) &&
      (!query.categoria || m.category === query.categoria) &&
      (!query.status || m.is_active === (query.status === "ativo")),
  );
  const hasFilters = Boolean(query.nome || query.categoria || query.status);
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
            {categories.map((c) => (
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
                <th>Nome</th>
                <th>Categoria</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td data-label="Nome">
                    <Link className="sc-row-title" href={`/admin/membros/${m.id}`}>
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
