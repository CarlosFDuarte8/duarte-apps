import { expect, it } from "vitest";
import { matchesName, matchesKind } from "./list-search";

it("finds accented names with separate words without changing the source list", () => {
  const names = ["João da Silva", "Álvaro Santos", "Maria Silva"];
  expect(names.filter(name => matchesName(name, " SILVA   joao "))).toEqual(["João da Silva"]);
  expect(names.filter(name => matchesName(name, "alvaro"))).toEqual(["Álvaro Santos"]);
  expect(names.filter(name => matchesName(name, "silva"))).toEqual(["João da Silva", "Maria Silva"]);
  expect(names.filter(name => matchesName(name, ""))).toEqual(names);
  expect(matchesKind(true, "members")).toBe(false);
  expect(matchesKind(false, "guests")).toBe(false);
  expect(matchesKind(true, "all")).toBe(true);
});
