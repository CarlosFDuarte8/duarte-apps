import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  signPhotos: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("./photos", () => ({ signPhotos: mocks.signPhotos }));
import { mobilePhotoPreflight, serveMobilePhotos } from "./mobile-photos";
const memberId = "11111111-1111-4111-8111-111111111111";
const guestId = "22222222-2222-4222-8222-222222222222";
const payload = {
  people: [
    { kind: "member", id: memberId },
    { kind: "guest", id: guestId },
  ],
};
function request(
  body: unknown = payload,
  headers: Record<string, string> = {},
) {
  return new Request("https://duarte-apps.vercel.app/api/admin/volei/photos", {
    method: "POST",
    headers: {
      Authorization: "Bearer test.jwt.token",
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
  vi.stubEnv("VOLEI_MOBILE_ALLOWED_ORIGINS", "http://localhost:8081");
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "admin" } },
    error: null,
  });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.from.mockImplementation((table: string) => ({
    select: (columns: string) => {
      expect(columns).toBe("id,photo_path");
      return {
        in: async (column: string, ids: string[]) => {
          expect(column).toBe("id");
          return {
            data: ids.map((id) => ({
              id,
              photo_path:
                table === "volei_members" ? `members/${id}/test.webp` : null,
            })),
            error: null,
          };
        },
      };
    },
  }));
  mocks.createClient.mockReturnValue({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: mocks.from,
  });
  mocks.signPhotos.mockImplementation(
    async (rows: { id: string; kind: string; photo_path: string | null }[]) =>
      rows.map((row) => ({
        ...row,
        photo_url: row.photo_path
          ? `https://project.supabase.co/signed/${row.id}`
          : null,
      })),
  );
});
describe("mobile administrative profile photos", () => {
  it("requires a bearer session instead of trusting a cookie or client-supplied admin flag", async () => {
    const result = await serveMobilePhotos(
      request(payload, { Authorization: "", Cookie: "admin=true" }),
    );
    expect(result.status).toBe(401);
    expect(result.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.signPhotos).not.toHaveBeenCalled();
  });
  it("verifies the user and admin RPC before reading any row or signing", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { status: 401 },
    });
    expect((await serveMobilePhotos(request())).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.signPhotos).not.toHaveBeenCalled();
  });
  it("rejects non-admins and permission lookup failures without using the signer", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    expect((await serveMobilePhotos(request())).status).toBe(403);
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "connection" },
    });
    expect((await serveMobilePhotos(request())).status).toBe(503);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.signPhotos).not.toHaveBeenCalled();
  });
  it("rejects raw storage paths, invalid IDs and oversized batches", async () => {
    for (const body of [
      {
        people: [
          { kind: "member", id: memberId, photo_path: "other/private.webp" },
        ],
      },
      { people: [{ kind: "member", id: "not-a-uuid" }] },
      { people: [] },
      { people: Array(101).fill(payload.people[0]) },
    ]) {
      expect((await serveMobilePhotos(request(body))).status).toBe(400);
    }
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.signPhotos).not.toHaveBeenCalled();
  });
  it("limits streamed bodies even without Content-Length", async () => {
    const result = await serveMobilePhotos(
      request({ extra: "x".repeat(21000) }),
    );
    expect(result.status).toBe(413);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("uses the caller's RLS client and returns only IDs, kinds and temporary URLs", async () => {
    const result = await serveMobilePhotos(request());
    expect(result.status).toBe(200);
    expect(mocks.getUser).toHaveBeenCalledWith("test.jwt.token");
    expect(mocks.rpc).toHaveBeenCalledWith("is_volei_admin");
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "public-test-key",
      expect.objectContaining({
        global: { headers: { Authorization: "Bearer test.jwt.token" } },
      }),
    );
    const body = await result.json();
    expect(body.people).toEqual([
      {
        kind: "member",
        id: memberId,
        url: `https://project.supabase.co/signed/${memberId}`,
      },
      { kind: "guest", id: guestId, url: null },
    ]);
    expect(JSON.stringify(body)).not.toContain("photo_path");
    expect(JSON.stringify(body)).not.toContain("public-test-key");
    expect(Date.parse(body.expiresAt) - Date.now()).toBeGreaterThan(3500000);
    expect(result.headers.get("Cache-Control")).toContain("no-store");
  });
  it("deduplicates requests and signs only paths resolved from existing visible rows", async () => {
    mocks.from.mockReturnValue({
      select: () => ({ in: async () => ({ data: [], error: null }) }),
    });
    const result = await serveMobilePhotos(
      request({ people: [payload.people[0], payload.people[0]] }),
    );
    expect((await result.json()).people).toEqual([
      { ...payload.people[0], url: null },
    ]);
    expect(mocks.signPhotos).toHaveBeenCalledWith([]);
  });
  it("fails closed on row-query errors and hides signing errors", async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        in: async () => ({ data: null, error: { message: "private schema" } }),
      }),
    });
    expect((await serveMobilePhotos(request())).status).toBe(503);
    expect(mocks.signPhotos).not.toHaveBeenCalled();
    mocks.from.mockReturnValue({
      select: () => ({ in: async () => ({ data: [], error: null }) }),
    });
    mocks.signPhotos.mockRejectedValue(new Error("secret storage path"));
    const result = await serveMobilePhotos(request());
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain("secret");
  });
  it("limits CORS to configured origins and supports bearer preflight", async () => {
    const allowed = mobilePhotoPreflight(
      request(payload, { Origin: "http://localhost:8081" }),
    );
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:8081",
    );
    expect(allowed.headers.get("Access-Control-Allow-Headers")).toContain(
      "Authorization",
    );
    const denied = await serveMobilePhotos(
      request(payload, { Origin: "https://untrusted.example" }),
    );
    expect(denied.status).toBe(403);
    expect(denied.headers.has("Access-Control-Allow-Origin")).toBe(false);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
