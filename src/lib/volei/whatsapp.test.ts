import { describe, expect, it } from "vitest";
import { whatsappInviteSchema } from "./whatsapp";

describe("WhatsApp group invitations", () => {
  it("normalizes copied invitations and removes tracking parameters", () => {
    expect(whatsappInviteSchema.parse("  https://chat.whatsapp.com/AbC123def456/?mode=gi_t#invite  "))
      .toBe("https://chat.whatsapp.com/AbC123def456");
  });
  it("allows clearing the public invitation", () => {
    expect(whatsappInviteSchema.parse("   ")).toBeNull();
  });
  it.each([
    "javascript:alert(1)", "http://chat.whatsapp.com/AbC123", "https://example.com/AbC123",
    "https://chat.whatsapp.com.example.com/AbC123", "https://chat.whatsapp.com@evil.example/AbC123",
    "https://user:password@chat.whatsapp.com/AbC123", "https://chat.whatsapp.com:8080/AbC123",
    "https://chat.whatsapp.com/", "https://chat.whatsapp.com/first/second", "https://chat.whatsapp.com/%22test",
  ])("rejects unsafe or unrelated links: %s", value => {
    expect(whatsappInviteSchema.safeParse(value).success).toBe(false);
  });
});
