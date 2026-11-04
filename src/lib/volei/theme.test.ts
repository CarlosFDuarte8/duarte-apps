import { runInNewContext } from "node:vm";
import { expect, it } from "vitest";
import { volleyThemeScript } from "./theme";

for (const [saved, systemDark, expected] of [["dark", false, "dark"], ["light", true, "light"], ["system", true, "dark"], [null, false, "light"], ["invalid", true, "dark"]]) {
  it(`initializes ${saved} with system dark=${systemDark}`, () => {
    const document = { documentElement: { dataset: {} } };
    runInNewContext(volleyThemeScript, { document, localStorage: { getItem: () => saved }, matchMedia: () => ({ matches: systemDark }) });
    expect(document.documentElement.dataset).toEqual({ volleyTheme: expected });
  });
}
it("uses system preference when storage is blocked", () => {
  const document = { documentElement: { dataset: {} } };
  runInNewContext(volleyThemeScript, { document, localStorage: { getItem: () => { throw Error("blocked"); } }, matchMedia: () => ({ matches: true }) });
  expect(document.documentElement.dataset).toEqual({ volleyTheme: "dark" });
});
