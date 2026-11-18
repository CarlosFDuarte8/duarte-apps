import { expect, it } from "vitest";
import { eventLinkSettingsSchema } from "./event-link-settings";

it("leaves both features disabled unless the administrator opts in", () => {
  expect(eventLinkSettingsSchema.parse({})).toEqual({ calendar_enabled: false, directions_enabled: false, directions_url: null });
  expect(eventLinkSettingsSchema.parse({ calendar_enabled: true }).calendar_enabled).toBe(true);
});
it("requires an explicit safe link for directions, independently from the calendar", () => {
  for (const directions_url of [null, "", "javascript:alert(1)", "data:text/html,test", "http://example.com", "https://user:secret@example.com"]) {
    expect(eventLinkSettingsSchema.safeParse({ directions_enabled: true, directions_url }).success).toBe(false);
  }
  const settings = eventLinkSettingsSchema.parse({ directions_enabled: true, directions_url: " https://maps.app.goo.gl/Quadra " });
  expect(settings).toEqual({ directions_enabled: true, calendar_enabled: false, directions_url: "https://maps.app.goo.gl/Quadra" });
});
it("retains the saved link while directions are disabled", () => {
  expect(eventLinkSettingsSchema.parse({ directions_enabled: false, directions_url: "https://www.waze.com/ul?ll=-15,-47" }).directions_url).toContain("waze.com");
});
