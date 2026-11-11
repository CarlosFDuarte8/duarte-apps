import { expect, it } from "vitest";
import {
  validPushEndpoint,
  webSubscriptionSchema,
} from "./web-push-validation";
it("aceita apenas provedores de push HTTPS, sem credenciais nem portas alternativas", () => {
  for (const endpoint of [
    "https://fcm.googleapis.com/fcm/send/test",
    "https://updates.push.services.mozilla.com/wpush/v2/test",
    "https://web.push.apple.com/test",
    "https://wns2.notify.windows.com/test",
  ])
    expect(validPushEndpoint(endpoint)).toBe(true);
  for (const endpoint of [
    "http://fcm.googleapis.com/test",
    "https://localhost/test",
    "https://127.0.0.1/test",
    "https://fcm.googleapis.com.evil.test/test",
    "https://evil.test/?next=https://fcm.googleapis.com",
    "https://user:pass@fcm.googleapis.com/test",
    "https://fcm.googleapis.com:8080/test",
  ])
    expect(validPushEndpoint(endpoint)).toBe(false);
});
it("valida chaves reais de inscrição sem aceitar formatos arbitrários", () => {
  const key = Buffer.alloc(65);
  key[0] = 4;
  const data = {
    endpoint: "https://fcm.googleapis.com/test",
    keys: {
      p256dh: key.toString("base64url"),
      auth: Buffer.alloc(16).toString("base64url"),
    },
  };
  expect(webSubscriptionSchema.safeParse(data).success).toBe(true);
  expect(
    webSubscriptionSchema.safeParse({
      ...data,
      keys: { ...data.keys, auth: "invalid" },
    }).success,
  ).toBe(false);
  expect(
    webSubscriptionSchema.safeParse({
      ...data,
      keys: { ...data.keys, p256dh: Buffer.alloc(65).toString("base64url") },
    }).success,
  ).toBe(false);
});
