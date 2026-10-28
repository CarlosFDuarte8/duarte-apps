import { z } from "zod";
export type CourtRosterPerson = {
  key: string;
  id: string;
  guest: boolean;
  memberId: string;
  name: string;
  skill: number | null;
  checkedInAt: string | null;
  photo_url?: string | null;
  emergency_name?: string;
  emergency_phone?: string;
  emergency_relationship?: string;
};
const arrivalSchema = z.object({
  key: z.string(),
  name: z.string(),
  arrivedAt: z.string(),
  departedAt: z.string().nullable(),
  order: z.number().int(),
  lastEntered: z.number().int(),
});
const matchSchema = z.object({
  round: z.number().int(),
  winner: z.number().int(),
  loser: z.number().int(),
  incoming: z.number().int(),
  borrowed: z.array(z.string()),
  at: z.string(),
});
export const courtStateSchema = z.object({
  teams: z.array(z.array(z.string())).min(3).max(4),
  playing: z.tuple([z.number().int(), z.number().int()]),
  waiting: z.array(z.number().int()),
  arrivals: z.array(arrivalSchema).max(24),
  started: z.boolean(),
  round: z.number().int().min(0),
  nextOrder: z.number().int().min(1),
  history: z.array(matchSchema).max(200),
});
export type CourtState = z.infer<typeof courtStateSchema>;
export type CourtAction =
  | { type: "arrive" | "leave" | "undo"; key: string }
  | { type: "shuffle" }
  | { type: "winner"; team: number }
  | { type: "swap"; first: string; second: string };
export function emptyCourt(count = 3): CourtState {
  return {
    teams: Array.from({ length: count }, () => []),
    playing: [0, 1],
    waiting: Array.from({ length: count - 2 }, (_, i) => i + 2),
    arrivals: [],
    started: false,
    round: 0,
    nextOrder: 1,
    history: [],
  };
}
const copy = (state: CourtState): CourtState => structuredClone(state);
const teamSum = (keys: string[], levels: Map<string, number>) =>
  keys.reduce((sum, key) => sum + (levels.get(key) ?? 3), 0);
export function teamLevel(keys: string[], roster: CourtRosterPerson[]) {
  if (!keys.length) return 0;
  return (
    teamSum(keys, new Map(roster.map((p) => [p.key, p.skill ?? 3]))) /
    keys.length
  );
}
function randomized<T>(items: T[], random: () => number) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
function balanceCost(teams: string[][], levels: Map<string, number>) {
  const all = teams.flat();
  const average = teamSum(all, levels) / all.length;
  return teams.reduce(
    (cost, team) =>
      cost +
      (team.length
        ? (teamSum(team, levels) - average * team.length) ** 2 / team.length
        : 0),
    0,
  );
}
export function balancedTeams(
  keys: string[],
  count: number,
  levels: Map<string, number>,
  random: () => number = Math.random,
) {
  const sizes = Array(count).fill(0);
  let remaining = keys.length;
  if (remaining < 12) {
    sizes[0] = sizes[1] = Math.floor(remaining / 2);
    sizes[2] = remaining % 2;
  } else {
    for (let i = 0; i < count; i++) {
      sizes[i] = Math.min(6, remaining);
      remaining -= sizes[i];
    }
  }
  let best: string[][] = [];
  let bestCost = Infinity;
  for (let attempt = 0; attempt < 80; attempt++) {
    const teams: string[][] = Array.from({ length: count }, () => []);
    const people = randomized(keys, random).sort(
      (a, b) => (levels.get(b) ?? 3) - (levels.get(a) ?? 3),
    );
    for (const key of people) {
      const available = randomized(
        sizes.map((_, i) => i).filter((i) => teams[i].length < sizes[i]),
        random,
      );
      available.sort(
        (a, b) =>
          teamSum(teams[a], levels) / sizes[a] -
          teamSum(teams[b], levels) / sizes[b],
      );
      teams[available[0]].push(key);
    }
    for (let pass = 0; pass < 8; pass++) {
      let improved = false;
      for (let a = 0; a < count; a++)
        for (let b = a + 1; b < count; b++)
          for (let i = 0; i < teams[a].length; i++)
            for (let j = 0; j < teams[b].length; j++) {
              const before = balanceCost(teams, levels);
              [teams[a][i], teams[b][j]] = [teams[b][j], teams[a][i]];
              if (balanceCost(teams, levels) < before - 1e-8) improved = true;
              else [teams[a][i], teams[b][j]] = [teams[b][j], teams[a][i]];
            }
      if (!improved) break;
    }
    const cost = balanceCost(teams, levels);
    if (
      cost < bestCost - 1e-8 ||
      (Math.abs(cost - bestCost) < 1e-8 && random() < 0.3)
    ) {
      bestCost = cost;
      best = teams.map((team) => randomized(team, random));
    }
  }
  return best;
}
function enter(state: CourtState, key: string, team: number) {
  for (const list of state.teams) {
    const i = list.indexOf(key);
    if (i >= 0) list.splice(i, 1);
  }
  state.teams[team].push(key);
  const arrival = state.arrivals.find((p) => p.key === key);
  if (arrival) arrival.lastEntered = state.nextOrder++;
}
function wait(state: CourtState, key: string) {
  const team = state.waiting.find((i) => state.teams[i].length < 6);
  if (team === undefined) throw Error("Não há lugar no banco de espera.");
  enter(state, key, team);
}
function bestBorrow(
  candidates: string[],
  needed: number,
  current: string[],
  opponent: string[],
  levels: Map<string, number>,
  random: () => number,
) {
  const count = Math.min(needed, candidates.length);
  if (!count) return [];
  let best: string[] = [];
  let difference = Infinity;
  const target = teamSum(opponent, levels) / Math.max(1, opponent.length);
  function choose(start: number, chosen: string[]) {
    if (chosen.length === count) {
      const result = [...current, ...chosen];
      const score = Math.abs(teamSum(result, levels) / result.length - target);
      if (
        score < difference - 1e-8 ||
        (Math.abs(score - difference) < 1e-8 && random() < 0.3)
      ) {
        difference = score;
        best = [...chosen];
      }
      return;
    }
    for (let i = start; i <= candidates.length - (count - chosen.length); i++)
      choose(i + 1, [...chosen, candidates[i]]);
  }
  choose(0, []);
  return best;
}
function repair(
  state: CourtState,
  levels: Map<string, number>,
  random: () => number,
) {
  if (!state.started) return;
  for (let step = 0; step < 30; step++) {
    const [a, b] = state.playing;
    const first = state.teams[a].length,
      second = state.teams[b].length;
    const outside = state.waiting.flatMap((i) => state.teams[i]);
    if (first !== second) {
      const short = first < second ? a : b,
        full = first < second ? b : a;
      if (outside.length) {
        const donor = state.waiting.find((i) => state.teams[i].length)!;
        const keys = bestBorrow(
          state.teams[donor],
          Math.abs(first - second),
          state.teams[short],
          state.teams[full],
          levels,
          random,
        );
        for (const key of keys) enter(state, key, short);
      } else {
        const longest = [...state.teams[full]].sort(
          (x, y) =>
            (state.arrivals.find((p) => p.key === x)?.lastEntered ?? 0) -
            (state.arrivals.find((p) => p.key === y)?.lastEntered ?? 0),
        )[0];
        wait(state, longest);
      }
    } else if (first < 6 && outside.length >= 2) {
      const [x, y] = outside;
      const current =
        teamSum(state.teams[a], levels) - teamSum(state.teams[b], levels);
      const delta = (levels.get(x) ?? 3) - (levels.get(y) ?? 3);
      if (Math.abs(current + delta) <= Math.abs(current - delta)) {
        enter(state, x, a);
        enter(state, y, b);
      } else {
        enter(state, y, a);
        enter(state, x, b);
      }
    } else break;
  }
}
export function resizeCourt(input: CourtState, count: number): CourtState {
  if (input.teams.length === count) return copy(input);
  const state = copy(input);
  const teams: string[][] = Array.from({ length: count }, () => []);
  const used = new Set<number>();
  const playing = state.playing.map((old) => {
    const index =
      old < count && !used.has(old)
        ? old
        : Array.from({ length: count }, (_, i) => i).find(
            (i) => !used.has(i) && !state.playing.includes(i),
          )!;
    used.add(index);
    teams[index] = [...state.teams[old]];
    return index;
  }) as [number, number];
  const waiting = [
    ...state.waiting.filter((i) => i < count && !used.has(i)),
    ...Array.from({ length: count }, (_, i) => i).filter(
      (i) => !used.has(i) && !state.waiting.includes(i),
    ),
  ];
  const outside = state.waiting.flatMap((i) => state.teams[i]);
  for (let i = 0; i < outside.length; i++) {
    const team = waiting[Math.floor(i / 6)];
    if (team === undefined)
      throw Error("Há jogadores demais para reduzir os times.");
    teams[team].push(outside[i]);
  }
  return { ...state, teams, playing, waiting };
}
export function applyCourtAction(
  input: CourtState,
  roster: CourtRosterPerson[],
  action: CourtAction,
  random: () => number = Math.random,
  now = new Date().toISOString(),
): CourtState {
  const state = copy(input);
  const people = new Map(roster.map((p) => [p.key, p]));
  const levels = new Map(roster.map((p) => [p.key, p.skill ?? 3]));
  if (action.type === "arrive") {
    const person = people.get(action.key);
    if (!person)
      throw Error(
        "Só participantes confirmados e liberados podem entrar na quadra.",
      );
    const previous = state.arrivals.find((p) => p.key === action.key);
    if (previous && !previous.departedAt) return state;
    state.arrivals = state.arrivals.filter((p) => p.key !== action.key);
    state.arrivals.push({
      key: action.key,
      name: person.name,
      arrivedAt: previous?.arrivedAt ?? now,
      departedAt: null,
      order: state.nextOrder++,
      lastEntered: 0,
    });
    if (state.started) {
      wait(state, action.key);
      repair(state, levels, random);
    }
  } else if (action.type === "leave" || action.type === "undo") {
    const person = state.arrivals.find((p) => p.key === action.key);
    if (!person)
      throw Error("A chegada desta pessoa ainda não foi registrada.");
    for (const team of state.teams) {
      const index = team.indexOf(action.key);
      if (index >= 0) team.splice(index, 1);
    }
    if (action.type === "undo")
      state.arrivals = state.arrivals.filter((p) => p.key !== action.key);
    else person.departedAt = now;
    repair(state, levels, random);
  } else if (action.type === "shuffle") {
    const keys = state.arrivals
      .filter((p) => !p.departedAt && people.has(p.key))
      .sort((a, b) => a.order - b.order)
      .map((p) => p.key);
    if (keys.length < 2)
      throw Error(
        "Registre a chegada de pelo menos duas pessoas antes do sorteio.",
      );
    state.teams = balancedTeams(keys, state.teams.length, levels, random);
    state.playing = [0, 1];
    state.waiting = state.teams.map((_, i) => i).slice(2);
    state.started = true;
    for (const index of state.playing)
      for (const key of state.teams[index]) {
        const arrival = state.arrivals.find((p) => p.key === key)!;
        arrival.lastEntered = state.nextOrder++;
      }
  } else if (action.type === "winner") {
    if (!state.started || !state.playing.includes(action.team))
      throw Error("Selecione um dos times que estão jogando.");
    repair(state, levels, random);
    const winner = action.team,
      loser = state.playing.find((i) => i !== winner)!;
    if (!state.teams[winner].length || !state.teams[loser].length)
      throw Error("É preciso ter jogadores nos dois times.");
    const incoming =
      state.waiting.find((i) => state.teams[i].length > 0) ?? loser;
    const borrowed: string[] = [];
    if (incoming !== loser) {
      const donors = [loser, ...state.waiting.filter((i) => i !== incoming)];
      for (const donor of donors) {
        const needed =
          state.teams[winner].length - state.teams[incoming].length;
        if (needed <= 0) break;
        const keys = bestBorrow(
          state.teams[donor],
          needed,
          state.teams[incoming],
          state.teams[winner],
          levels,
          random,
        );
        for (const key of keys) {
          enter(state, key, incoming);
          borrowed.push(key);
        }
      }
      state.playing = [winner, incoming];
      state.waiting = [...state.waiting.filter((i) => i !== incoming), loser];
      for (const key of state.teams[incoming]) {
        const arrival = state.arrivals.find((p) => p.key === key)!;
        arrival.lastEntered = state.nextOrder++;
      }
    }
    state.round++;
    state.history.push({
      round: state.round,
      winner,
      loser,
      incoming,
      borrowed,
      at: now,
    });
    state.history = state.history.slice(-200);
    repair(state, levels, random);
  } else if (action.type === "swap") {
    if (!state.started || action.first === action.second)
      throw Error("Selecione dois jogadores diferentes.");
    const a = state.teams.findIndex((team) => team.includes(action.first)),
      b = state.teams.findIndex((team) => team.includes(action.second));
    if (a < 0 || b < 0 || a === b)
      throw Error("Selecione jogadores de times diferentes.");
    const i = state.teams[a].indexOf(action.first),
      j = state.teams[b].indexOf(action.second);
    [state.teams[a][i], state.teams[b][j]] = [
      state.teams[b][j],
      state.teams[a][i],
    ];
    for (const key of [action.first, action.second]) {
      const team = state.teams.findIndex((t) => t.includes(key));
      if (state.playing.includes(team))
        state.arrivals.find((p) => p.key === key)!.lastEntered =
          state.nextOrder++;
    }
  }
  return state;
}
