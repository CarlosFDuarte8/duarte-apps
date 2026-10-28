import { describe, it, expect } from "vitest";
import {
  applyCourtAction,
  emptyCourt,
  balancedTeams,
  resizeCourt,
  type CourtState,
  type CourtRosterPerson,
} from "./court";
function roster(count: number): CourtRosterPerson[] {
  return Array.from({ length: count }, (_, i) => ({
    key: `m:${i}`,
    id: String(i),
    guest: false,
    memberId: String(i),
    name: `Pessoa ${i}`,
    skill: (i % 5) + 1,
    checkedInAt: null,
  }));
}
function random(seed = 7) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}
function arrived(people: CourtRosterPerson[], teams = 3) {
  let state = emptyCourt(teams);
  for (const person of people)
    state = applyCourtAction(
      state,
      people,
      { type: "arrive", key: person.key },
      random(),
      "2026-10-28T19:00:00Z",
    );
  return state;
}
function invariants(state: CourtState) {
  const assigned = state.teams.flat(),
    active = state.arrivals.filter((p) => !p.departedAt).map((p) => p.key);
  expect(new Set(assigned).size).toBe(assigned.length);
  expect(state.teams.every((team) => team.length <= 6)).toBe(true);
  expect([...state.playing, ...state.waiting].sort()).toEqual(
    state.teams.map((_, i) => i),
  );
  if (state.started) {
    expect([...assigned].sort()).toEqual([...active].sort());
    expect(state.teams[state.playing[0]].length).toBe(
      state.teams[state.playing[1]].length,
    );
  }
}
describe("Times e rodízio", () => {
  it("sorteia tamanhos corretos, sem duplicatas, com equilíbrio e apenas presentes", () => {
    const people = roster(24),
      levels = new Map(people.map((p) => [p.key, p.skill!]));
    const teams = balancedTeams(
      people.map((p) => p.key),
      4,
      levels,
      random(),
    );
    expect(teams.map((t) => t.length)).toEqual([6, 6, 6, 6]);
    const totals = teams.map((t) =>
      t.reduce((sum, key) => sum + levels.get(key)!, 0),
    );
    expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(1);
    const state = applyCourtAction(
      arrived(people.slice(0, 8)),
      people,
      { type: "shuffle" },
      random(),
    );
    expect(state.teams.flat()).toHaveLength(8);
    expect(state.teams.map((t) => t.length)).toEqual([4, 4, 0]);
    invariants(state);
  });
  it("mantém o vencedor sem limite e respeita a fila de quatro times", () => {
    const people = roster(24);
    let state = applyCourtAction(
      arrived(people, 4),
      people,
      { type: "shuffle" },
      random(),
    );
    const winner = [...state.teams[0]];
    state = applyCourtAction(
      state,
      people,
      { type: "winner", team: 0 },
      random(),
    );
    expect(state.playing).toEqual([0, 2]);
    expect(state.waiting).toEqual([3, 1]);
    for (let i = 0; i < 15; i++) {
      state = applyCourtAction(
        state,
        people,
        { type: "winner", team: 0 },
        random(),
      );
      expect(state.teams[0]).toEqual(winner);
      expect(state.playing).toContain(0);
      invariants(state);
    }
    expect(state.round).toBe(16);
  });
  it("completa o próximo time aproveitando do perdedor a combinação mais equilibrada", () => {
    const people = roster(14);
    for (let i = 0; i < 6; i++) people[i].skill = 3;
    [1, 2, 3, 4, 5, 5].forEach((level, i) => (people[i + 6].skill = level));
    people[12].skill = people[13].skill = 1;
    const state = arrived(people);
    state.started = true;
    state.teams = [
      people.slice(0, 6).map((p) => p.key),
      people.slice(6, 12).map((p) => p.key),
      people.slice(12).map((p) => p.key),
    ];
    const next = applyCourtAction(
      state,
      people,
      { type: "winner", team: 0 },
      random(),
    );
    expect(next.teams[0]).toEqual(state.teams[0]);
    expect(next.teams[2]).toHaveLength(6);
    expect(next.teams[1]).toHaveLength(2);
    expect(next.history[0].borrowed).toHaveLength(4);
    expect(
      next.teams[2].reduce(
        (sum, key) => sum + people.find((p) => p.key === key)!.skill!,
        0,
      ),
    ).toBe(18);
    invariants(next);
  });
  it("coloca novas chegadas no próximo time sem refazer os que jogam", () => {
    const people = roster(18);
    let state = applyCourtAction(
      arrived(people.slice(0, 12)),
      people,
      { type: "shuffle" },
      random(),
    );
    const playing = state.playing.map((i) => [...state.teams[i]]);
    for (const person of people.slice(12))
      state = applyCourtAction(
        state,
        people,
        { type: "arrive", key: person.key },
        random(),
      );
    expect(state.playing.map((i) => state.teams[i])).toEqual(playing);
    expect(state.teams[2]).toEqual(people.slice(12).map((p) => p.key));
    invariants(state);
  });
  it("substitui quem sai, preserva o registro da chegada e coloca o retorno na fila", () => {
    const people = roster(18);
    let state = applyCourtAction(
      arrived(people),
      people,
      { type: "shuffle" },
      random(),
    );
    const key = state.teams[0][0],
      stamp = state.arrivals.find((p) => p.key === key)!.arrivedAt;
    state = applyCourtAction(state, people, { type: "leave", key }, random());
    expect(state.teams[0]).toHaveLength(6);
    expect(state.teams[2]).toHaveLength(5);
    expect(
      state.arrivals.find((p) => p.key === key)!.departedAt,
    ).not.toBeNull();
    invariants(state);
    state = applyCourtAction(state, people, { type: "arrive", key }, random());
    expect(state.teams[2]).toContain(key);
    expect(state.arrivals.find((p) => p.key === key)!.arrivedAt).toBe(stamp);
    invariants(state);
  });
  it("mantém os times com o mesmo tamanho quando faltam pessoas", () => {
    const people = roster(12);
    let state = applyCourtAction(
      arrived(people),
      people,
      { type: "shuffle" },
      random(),
    );
    state = applyCourtAction(
      state,
      people,
      { type: "leave", key: state.teams[0][0] },
      random(),
    );
    expect(state.teams.map((t) => t.length)).toEqual([5, 5, 1]);
    invariants(state);
  });
  it("oferece trocas manuais e permite aumentar para quatro times", () => {
    const people = roster(18);
    let state = applyCourtAction(
      arrived(people),
      people,
      { type: "shuffle" },
      random(),
    );
    const first = state.teams[0][0],
      second = state.teams[1][0];
    state = applyCourtAction(state, people, { type: "swap", first, second });
    expect(state.teams[0]).toContain(second);
    expect(state.teams[1]).toContain(first);
    state = resizeCourt(state, 4);
    expect(state.teams[3]).toEqual([]);
    expect(state.waiting).toEqual([2, 3]);
    invariants(state);
  });
  it("preserva invariantes em sequências de partidas, saídas e retornos", () => {
    const people = roster(24),
      rng = random(123);
    let state = applyCourtAction(
      arrived(people, 4),
      people,
      { type: "shuffle" },
      rng,
    );
    for (let i = 0; i < 100; i++) {
      const key = people[Math.floor(rng() * people.length)].key;
      const arrival = state.arrivals.find((p) => p.key === key)!;
      if (i % 3 === 0)
        state = applyCourtAction(
          state,
          people,
          { type: arrival.departedAt ? "arrive" : "leave", key },
          rng,
        );
      else if (state.playing.every((team) => state.teams[team].length))
        state = applyCourtAction(
          state,
          people,
          { type: "winner", team: state.playing[Math.floor(rng() * 2)] },
          rng,
        );
      invariants(state);
    }
  });
});
