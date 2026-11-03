import { afterEach, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";

afterEach(() => vi.unstubAllGlobals());
it("uses the clipboard API without adding a textarea", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  await copyText("link");
  expect(writeText).toHaveBeenCalledWith("link");
});
for (const success of [true, false]) {
  it(`fallback ${success ? "succeeds" : "fails"} and always removes the textarea`, async () => {
    const area = { value: "", style: {}, select: vi.fn(), remove: vi.fn() };
    const focus = vi.fn();
    class Element { focus = focus; }
    vi.stubGlobal("HTMLElement", Element);
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("document", { createElement: () => area, body: { appendChild: vi.fn() }, activeElement: new Element(), execCommand: () => success });
    if (success) await expect(copyText("link")).resolves.toBeUndefined();
    else await expect(copyText("link")).rejects.toThrow("Falha ao copiar");
    expect(area.remove).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
  });
}
