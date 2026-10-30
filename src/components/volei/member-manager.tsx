"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Pencil,
  Plus,
  Search,
  Users,
  SlidersHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { addMember } from "@/app/admin/volei-actions";
import { displayPhone } from "@/lib/volei/phone";
import type { VoleiMember } from "@/lib/volei/domain";
import { WEEKDAY_LABELS } from "@/lib/volei/frequency";
import { PhoneInput } from "./phone-input";
import { useRun } from "./use-run";
import { LinkPending } from "./link-pending";
import { PersonAvatar } from "./person-avatar";
import { ageLabel, ageOn } from "@/lib/volei/profile";
import "./management.css";
import "./volei.css";
import "./members.css";

const sortColumns = [
  { key: "name", label: "Nome", heading: "Membro" },
  { key: "phone", label: "Telefone", heading: "Telefone" },
  { key: "status", label: "Situação", heading: "Situação" },
  { key: "group", label: "Grupo", heading: "Grupo" },
  { key: "preferences", label: "Preferências", heading: "Preferências" },
] as const;
type SortColumn = (typeof sortColumns)[number]["key"];

function sortValue(member: VoleiMember, column: SortColumn) {
  switch (column) {
    case "name":
      return member.name;
    case "phone":
      return (member.phone ?? "").replace(/\D/g, "");
    case "status":
      return [
        member.membership_status === "pending"
          ? "Aprovação pendente"
          : member.membership_status === "rejected"
            ? "Não aprovado"
            : member.is_active
              ? "Ativo"
              : "Inativo",
        member.blocked ? "Bloqueado" : "",
      ].join(" ");
    case "group":
      return member.is_core ? "Principal" : "Regular";
    case "preferences":
      return `${member.preferred_weekdays?.length ? member.preferred_weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ") : "Sem dias fixos"} ${member.preferred_dates?.length ?? 0}`;
  }
}

function MemberStatus({ member }: { member: VoleiMember }) {
  return (
    <span className="vm-member-statuses">
      {member.membership_status === "pending" ? (
        <Badge variant="outline" className="vm-status-pending">
          Aprovação pendente
        </Badge>
      ) : member.membership_status === "rejected" ? (
        <Badge variant="outline">Não aprovado</Badge>
      ) : (
        <Badge variant="secondary">
          {member.is_active ? "Ativo" : "Inativo"}
        </Badge>
      )}
      {(member.membership_status ?? "approved") !== "approved" &&
        !member.is_active && <Badge variant="outline">Inativo</Badge>}
      {member.blocked && (
        <Badge variant="destructive" className="vm-status-blocked">
          Bloqueado
        </Badge>
      )}
    </span>
  );
}

export function MemberManager({ members }: { members: VoleiMember[] }) {
  const { run, pending, feedback } = useRun();
  const [creating, setCreating] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("todos");
  const [day, setDay] = useState("");
  const [order, setOrder] = useState("asc");
  const [sortBy, setSortBy] = useState<SortColumn>("name");
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const query = search.trim();
  const phoneQuery = query.replace(/\D/g, "");
  const filtered = members
    .filter(
      (m) =>
        (normalize(m.name).includes(normalize(query)) ||
          (!!phoneQuery &&
            (m.phone ?? "").replace(/\D/g, "").includes(phoneQuery))) &&
        (group === "todos" ||
          (group === "pending"
            ? m.membership_status === "pending"
            : group === "principal"
              ? m.is_core
              : group === "ativos"
                ? m.is_active &&
                  (m.membership_status ?? "approved") === "approved" &&
                  !m.blocked
                : group === "bloqueados"
                  ? m.blocked
                  : group === "rejected"
                    ? m.membership_status === "rejected"
                    : !m.is_active)) &&
        (!day || m.preferred_weekdays?.includes(Number(day))),
    )
    .sort((a, b) => {
      const first = sortValue(a, sortBy);
      const second = sortValue(b, sortBy);
      // Missing contacts stay last in either direction; ties use the member's name.
      if (!first && second) return 1;
      if (first && !second) return -1;
      return (
        (order === "asc" ? 1 : -1) *
          first.localeCompare(second, "pt-BR", {
            sensitivity: "base",
            numeric: true,
          }) ||
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }) ||
        a.id.localeCompare(b.id)
      );
    });
  const pendingCount = members.filter(
    (m) => m.membership_status === "pending",
  ).length;
  const hasFilters = !!query || group !== "todos" || !!day;
  function clearFilters() {
    setSearch("");
    setGroup("todos");
    setDay("");
  }

  return (
    <>
      <div className="vm-metrics vm-member-metrics">
        <button
          type="button"
          onClick={() => setGroup("todos")}
          aria-pressed={group === "todos"}
        >
          <strong>{members.length}</strong>
          <span>Todos</span>
        </button>
        <button
          type="button"
          onClick={() => setGroup("ativos")}
          aria-pressed={group === "ativos"}
        >
          <strong>
            {
              members.filter(
                (m) =>
                  m.is_active &&
                  !m.blocked &&
                  (m.membership_status ?? "approved") === "approved",
              ).length
            }
          </strong>
          <span>Ativos</span>
        </button>
        <button
          type="button"
          onClick={() => setGroup("principal")}
          aria-pressed={group === "principal"}
        >
          <strong>{members.filter((m) => m.is_core).length}</strong>
          <span>Principais</span>
        </button>
        <button
          type="button"
          className={pendingCount ? "vm-pending-metric" : ""}
          onClick={() => setGroup(group === "pending" ? "todos" : "pending")}
          aria-pressed={group === "pending"}
        >
          <strong>{pendingCount}</strong>
          <span>Pendentes</span>
        </button>
      </div>

      <section
        className="volley-card vm-members-panel"
        aria-labelledby="vm-members-heading"
      >
        <header className="vm-section-head vm-members-toolbar">
          <div>
            <h2 id="vm-members-heading">Lista de membros</h2>
            <p>Contatos e preferências do seu grupo, em um só lugar.</p>
          </div>
          <Button
            type="button"
            onClick={() => setCreating(!creating)}
            aria-expanded={creating}
            aria-controls="vm-create-member"
          >
            <Plus aria-hidden="true" />
            {creating ? "Fechar cadastro" : "Novo membro"}
          </Button>
        </header>

        {creating && (
          <form
            id="vm-create-member"
            className="vm-create-member"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () => addMember(name, phone),
                () => {
                  setName("");
                  setPhone("");
                  setCreating(false);
                },
              );
            }}
          >
            <h3>Cadastrar membro</h3>
            <div className="vm-create-fields">
              <label>
                Nome completo
                <Input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  placeholder="Nome e sobrenome"
                />
              </label>
              <label>
                Telefone (opcional)
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  aria-label="Telefone do novo membro"
                />
              </label>
              <Button type="submit" loading={pending}>
                {pending ? "Salvando…" : "Cadastrar membro"}
              </Button>
            </div>
            {feedback}
          </form>
        )}

        <div className="vm-members-filters">
          <label className="vm-members-search">
            Buscar membro
            <span>
              <Search aria-hidden="true" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome ou telefone"
                type="search"
              />
            </span>
          </label>
          <Button
            className="vm-filter-toggle"
            variant="outline"
            aria-expanded={filtersOpen}
            aria-controls="vm-more-filters"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <SlidersHorizontal aria-hidden="true" />
            Filtros{group !== "todos" || day ? " •" : ""}
          </Button>
          <div
            className="vm-members-more-filters"
            id="vm-more-filters"
            data-open={filtersOpen}
          >
            <label>
              Grupo e situação
              <NativeSelect
                value={group}
                onChange={(e) => setGroup(e.target.value)}
              >
                <option value="todos">Todos os membros</option>
                <option value="pending">Aprovação pendente</option>
                <option value="principal">Grupo principal</option>
                <option value="ativos">Ativos</option>
                <option value="inativos">Inativos</option>
                <option value="bloqueados">Bloqueados</option>
                <option value="rejected">Não aprovados</option>
              </NativeSelect>
            </label>
            <label>
              Dia preferido
              <NativeSelect
                value={day}
                onChange={(e) => setDay(e.target.value)}
              >
                <option value="">Qualquer dia</option>
                {WEEKDAY_LABELS.map((label, i) => (
                  <option key={label} value={String(i)}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label>
              Ordenar por
              <NativeSelect
                value={`${sortBy}:${order}`}
                onChange={(e) => {
                  const [column, direction] = e.target.value.split(":");
                  setSortBy(column as SortColumn);
                  setOrder(direction);
                }}
              >
                {sortColumns.map(({ key, label }) => [
                  <option key={`${key}:asc`} value={`${key}:asc`}>
                    {label} · {key === "phone" ? "crescente" : "A–Z"}
                  </option>,
                  <option key={`${key}:desc`} value={`${key}:desc`}>
                    {label} · {key === "phone" ? "decrescente" : "Z–A"}
                  </option>,
                ])}
              </NativeSelect>
            </label>
          </div>
        </div>
        <div className="vm-members-results">
          <p role="status">
            {filtered.length} de {members.length} membros
          </p>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>

        <Table className="vm-members-table" role="table">
          <TableCaption className="sr-only">
            Membros do vôlei, ordenados por{" "}
            {sortColumns
              .find((column) => column.key === sortBy)
              ?.label.toLowerCase()}
            , em ordem {order === "asc" ? "crescente" : "decrescente"}.
          </TableCaption>
          <TableHeader role="rowgroup">
            <TableRow role="row">
              {sortColumns.map(({ key, label, heading }) => (
                <TableHead
                  key={key}
                  scope="col"
                  role="columnheader"
                  aria-sort={
                    sortBy !== key
                      ? "none"
                      : order === "asc"
                        ? "ascending"
                        : "descending"
                  }
                >
                  <button
                    type="button"
                    className="vm-name-sort"
                    onClick={() => {
                      setSortBy(key);
                      setOrder(
                        sortBy === key && order === "asc" ? "desc" : "asc",
                      );
                    }}
                    aria-label={`Ordenar por ${label.toLowerCase()} em ordem ${sortBy === key && order === "asc" ? "decrescente" : "crescente"}`}
                  >
                    {heading}
                    {sortBy !== key ? (
                      <ArrowUpDown aria-hidden="true" />
                    ) : order === "asc" ? (
                      <ArrowDown aria-hidden="true" />
                    ) : (
                      <ArrowUp aria-hidden="true" />
                    )}
                  </button>
                </TableHead>
              ))}
              <TableHead scope="col" role="columnheader">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody role="rowgroup">
            {filtered.map((m) => (
              <TableRow key={m.id} role="row">
                <TableCell className="vm-member-name" role="cell">
                  <div className="vp-member-person">
                    <PersonAvatar name={m.name} photoUrl={m.photo_url} />
                    <div>
                      <Link href={`/admin/volei/membros/${m.id}`}>
                        {m.name}
                        <LinkPending />
                      </Link>
                      <small
                        className={`vp-member-age${(ageOn(m.birth_date) ?? 18) < 18 ? " is-minor" : ""}`}
                      >
                        {ageLabel(m.birth_date)}
                      </small>
                    </div>
                  </div>
                </TableCell>
                <TableCell
                  data-label="Telefone"
                  className="vm-member-phone"
                  role="cell"
                >
                  {m.phone ? (
                    displayPhone(m.phone)
                  ) : (
                    <span className="vm-muted">Não informado</span>
                  )}
                </TableCell>
                <TableCell data-label="Situação" role="cell">
                  <MemberStatus member={m} />
                </TableCell>
                <TableCell data-label="Grupo" role="cell">
                  {m.is_core ? (
                    <Badge variant="secondary">Principal</Badge>
                  ) : (
                    <span className="vm-muted">Regular</span>
                  )}
                </TableCell>
                <TableCell
                  data-label="Preferências"
                  className="vm-member-days"
                  role="cell"
                >
                  <span>
                    {m.preferred_weekdays?.length
                      ? m.preferred_weekdays
                          .map((d) => WEEKDAY_LABELS[d])
                          .join(", ")
                      : "Sem dias fixos"}
                  </span>
                  {!!m.preferred_dates?.length && (
                    <small>
                      {m.preferred_dates.length}{" "}
                      {m.preferred_dates.length === 1
                        ? "data avulsa"
                        : "datas avulsas"}
                    </small>
                  )}
                </TableCell>
                <TableCell className="vm-member-action" role="cell">
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/admin/volei/membros/${m.id}`}
                      aria-label={`Editar ${m.name}`}
                    >
                      <Pencil aria-hidden="true" />
                      Editar
                      <LinkPending />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow role="row">
                <TableCell colSpan={6} className="vm-members-empty" role="cell">
                  <Users aria-hidden="true" />
                  <h3>
                    {hasFilters
                      ? "Nenhum membro encontrado"
                      : "Seu grupo começa aqui"}
                  </h3>
                  <p>
                    {hasFilters
                      ? "Tente outro nome ou ajuste os filtros."
                      : "Cadastre o primeiro membro para organizar o grupo."}
                  </p>
                  {hasFilters && (
                    <Button variant="outline" onClick={clearFilters}>
                      Limpar filtros
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </>
  );
}
