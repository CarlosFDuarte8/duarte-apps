import { webcrypto } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import { calendar, defaultRules, validatePeriod } from "./domain";
import { randomUUID } from "./uuid";

afterEach(() => vi.unstubAllGlobals());

it("generates valid unique UUIDs without crypto.randomUUID on HTTP", () => {
  vi.stubGlobal("crypto", {
    getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
  });
  const ids = Array.from({ length: 100 }, () => randomUUID());
  expect(ids.every((id) => z.uuidv4().safeParse(id).success)).toBe(true);
  expect(new Set(ids).size).toBe(ids.length);
});

it("opens and validates a draft when crypto.randomUUID is unavailable", () => {
  vi.stubGlobal("crypto", {
    getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
  });
  const events = calendar("2026-10", ["porteiro"], defaultRules);
  expect(events.length).toBeGreaterThan(0);
  expect(() => validatePeriod({
    id: randomUUID(),
    month: "2026-10",
    status: "draft",
    categories: ["porteiro"],
    events,
  }, { members: [], dependencies: [], rules: defaultRules })).not.toThrow();
});
