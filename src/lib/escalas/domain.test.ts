import { describe, it, expect } from "vitest";
import membersData from "../../../supabase/imports/members.json";
import dependenciesData from "../../../supabase/imports/dependencies.json";
import october from "../../../supabase/imports/2026-10.json";
import november from "../../../supabase/imports/2026-11.json";
import december from "../../../supabase/imports/2026-12.json";
import { z } from "zod";
import {
  categories,
  memberSchema,
  dependencySchema,
  defaultRules,
  generate,
  weekday,
  assertPublishable,
  validatePeriod,
  periodSchema,
  calendar,
  type Context,
  type Event,
} from "./domain";
const base: Context = {
  members: z.array(memberSchema).parse(membersData),
  dependencies: z.array(dependencySchema).parse(dependenciesData),
  rules: defaultRules,
};
const id = (name: string) => base.members.find((m) => m.name === name)!.id;
const generated = generate("2026-10", "2026-12", [...categories], base);
const events = generated.periods.flatMap((p) => p.events);
describe("Geração de escalas", () => {
  it("gera 3 rascunhos completos sem conflitos", () => {
    expect(generated.periods).toHaveLength(3);
    expect(generated.conflicts).toEqual([]);
    expect(generated.periods.every((p) => p.status === "draft")).toBe(true);
  });
  it("Hélio nunca aparece na sexta-feira", () => {
    expect(
      events.some(
        (e) =>
          weekday(e.date) === 5 &&
          e.assignments.some((a) => a.member_id === id("Hélio")),
      ),
    ).toBe(false);
  });
  it("Míria aparece em todo culto com Nelson e somente nesses cultos", () => {
    const cults = events.filter((e) => e.kind === "culto");
    expect(
      cults.some((e) =>
        e.assignments.some((a) => a.member_id === id("Nelson")),
      ),
    ).toBe(true);
    for (const e of cults)
      expect(e.assignments.some((a) => a.member_id === id("Míria"))).toBe(
        e.assignments.some((a) => a.member_id === id("Nelson")),
      );
  });
  it("Pabline no culto sempre exige Cecília na meia hora", () => {
    const pabline = events.filter((e) =>
      e.assignments.some(
        (a) => a.role === "culto" && a.member_id === id("Pabline"),
      ),
    );
    expect(pabline.length).toBeGreaterThan(0);
    for (const e of pabline)
      expect(e.assignments.find((a) => a.role === "meia_hora")?.member_id).toBe(
        id("Cecília"),
      );
  });
  it("primeiro e segundo porteiros são diferentes", () => {
    for (const e of events.filter((e) => e.kind === "culto"))
      expect(
        e.assignments.find((a) => a.role === "primeiro")?.member_id,
      ).not.toBe(e.assignments.find((a) => a.role === "segundo")?.member_id);
  });
  it("exclui membros inativos", () => {
    const context = structuredClone(base);
    context.members.find((m) => m.name === "Fidel")!.is_active = false;
    const result = generate("2026-10", "2026-10", [...categories], context);
    expect(result.conflicts).toEqual([]);
    expect(
      result.periods[0].events.some((e) =>
        e.assignments.some((a) => a.member_id === id("Fidel")),
      ),
    ).toBe(false);
  });
  it("respeita datas indisponíveis e entrada futura", () => {
    const context = structuredClone(base);
    context.members.find((m) => m.name === "Fidel")!.unavailable_dates = [
      "2026-10-02",
    ];
    context.members.find((m) => m.name === "Gilberto")!.joined_on =
      "2026-11-01";
    const result = generate("2026-10", "2026-10", [...categories], context);
    expect(result.conflicts).toEqual([]);
    expect(
      result.periods[0].events
        .find((e) => e.date === "2026-10-02")!
        .assignments.some((a) => a.member_id === id("Fidel")),
    ).toBe(false);
    expect(
      result.periods[0].events.some((e) =>
        e.assignments.some((a) => a.member_id === id("Gilberto")),
      ),
    ).toBe(false);
  });
  it("ensaio é criado na primeira terça-feira, inclusive no dia 1", () => {
    expect(
      events.filter((e) => e.kind === "ensaio").map((e) => e.date),
    ).toEqual(["2026-10-06", "2026-11-03", "2026-12-01"]);
  });
  it("bloqueia publicação com conflitos", () => {
    const period = structuredClone(generated.periods[0]);
    period.events[0].assignments = [];
    expect(() => assertPublishable(period, base)).toThrow(
      "Publicação bloqueada",
    );
    expect(() => assertPublishable(generated.periods[0], base)).not.toThrow();
  });
  it("considera a carga histórica na escolha", () => {
    const historical: Event[] = Array.from({ length: 30 }, (_, i) => ({
      id: crypto.randomUUID(),
      date: `2026-09-${String(i + 1).padStart(2, "0")}`,
      kind: "culto",
      notes: "",
      assignments: [{ role: "primeiro", member_id: id("Fidel") }],
    }));
    const result = generate(
      "2026-10",
      "2026-10",
      [...categories],
      base,
      historical,
    );
    expect(result.conflicts).toEqual([]);
    expect(
      result.periods[0].events.some((e) =>
        e.assignments.some((a) => a.member_id === id("Fidel")),
      ),
    ).toBe(false);
  });
  it("valida novamente trocas manuais que violam disponibilidade ou vínculo", () => {
    const period = structuredClone(generated.periods[0]);
    const friday = period.events.find(
      (e) => e.kind === "culto" && weekday(e.date) === 5,
    )!;
    friday.assignments.find((a) => a.role === "primeiro")!.member_id =
      id("Hélio");
    expect(
      validatePeriod(period, base).some((c) => c.rule.includes("Hélio")),
    ).toBe(true);
    expect(() => assertPublishable(period, base)).toThrow();
    const pabline = period.events.find((e) =>
      e.assignments.some(
        (a) => a.role === "culto" && a.member_id === id("Pabline"),
      ),
    )!;
    pabline.assignments.find((a) => a.role === "meia_hora")!.member_id =
      id("Glenia");
    expect(
      validatePeriod(period, base).some((c) => c.rule.includes("Cecília")),
    ).toBe(true);
  });
  it("não ignora regras quando não há combinação válida", () => {
    const context = structuredClone(base);
    context.members
      .filter((m) => m.category === "porteiro")
      .forEach((m) => {
        m.is_active = false;
      });
    const result = generate("2026-10", "2026-10", [...categories], context);
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts.every((c) => c.date && c.rule && c.solutions)).toBe(
      true,
    );
    expect(() => assertPublishable(result.periods[0], context)).toThrow();
  });
  it("detecta dependências entre categorias excluídas", () => {
    const result = generate("2026-10", "2026-10", ["porteiro"], base);
    for (const e of result.periods[0].events.filter((e) => e.kind === "culto"))
      expect(e.assignments.some((a) => a.member_id === id("Nelson"))).toBe(
        false,
      );
  });
  it("valida intervalo e calendário em ano bissexto", () => {
    expect(() =>
      generate("2026-12", "2026-10", [...categories], base),
    ).toThrow();
    expect(() =>
      generate("2026-01", "2027-01", [...categories], base),
    ).toThrow();
    const configured = { ...defaultRules, official_weekdays: [2] };
    expect(
      calendar("2028-02", [...categories], configured).some(
        (e) => e.date === "2028-02-29",
      ),
    ).toBe(true);
  });
  it("detecta eventos faltantes e duplicados", () => {
    const p = structuredClone(generated.periods[0]);
    p.events.pop();
    expect(validatePeriod(p, base).some((c) => c.category === "evento")).toBe(
      true,
    );
  });
  it("os PDFs importados respeitam as regras e contêm 42 eventos/172 atribuições", () => {
    const imported = [october, november, december].map((p) =>
      periodSchema.parse(p),
    );
    expect(imported.flatMap((p) => validatePeriod(p, base))).toEqual([]);
    expect(imported.flatMap((p) => p.events)).toHaveLength(42);
    expect(
      imported.flatMap((p) => p.events.flatMap((e) => e.assignments)),
    ).toHaveLength(172);
  });
});
