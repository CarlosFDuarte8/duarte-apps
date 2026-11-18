import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button loading state", () => {
  it("disables submission and shows the pending label without leaking React props", () => {
    const html = renderToStaticMarkup(createElement(Button, { loading: true, loadingText: "Enviando…", type: "submit" }, "Enviar"));
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Enviando…");
    expect(html).not.toMatch(/\sloading(?:text)?=/i);
    expect(html).not.toContain(">Enviar<");
  });

  it("keeps the original content and explicit disabled state outside loading", () => {
    const html = renderToStaticMarkup(createElement(Button, { disabled: true }, "Confirmar"));
    expect(html).toContain("Confirmar");
    expect(html).toContain('disabled=""');
    expect(html).not.toContain("aria-busy");
  });
});
