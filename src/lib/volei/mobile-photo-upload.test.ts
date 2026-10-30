import { beforeEach, expect, it, vi } from "vitest";
import sharp from "sharp";
const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  save: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/escalas/supabase", () => ({
  serviceClient: () => ({
    storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
  }),
}));
import { mobilePhotoUpload } from "./mobile-photo-upload";
const id = "11111111-1111-4111-8111-111111111111";
function request(
  body: Uint8Array = new Uint8Array([1]),
  method = "POST",
  headers = {},
) {
  return new Request(
    `https://example.com/api/admin/volei/profile-photo?id=${id}&kind=member`,
    {
      method,
      headers: {
        Authorization: "Bearer fake.jwt.token",
        "Content-Type": "image/jpeg",
        ...headers,
      },
      ...(method === "POST" ? { body: Buffer.from(body) } : {}),
    },
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public");
  mocks.getUser.mockResolvedValue({ data: { user: { id } }, error: null });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.save.mockResolvedValue({ data: { id }, error: null });
  mocks.from.mockImplementation(() => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({
          data: { id, photo_path: "members/old.webp" },
          error: null,
        }),
      }),
    }),
    update: (changes: unknown) => {
      expect(Object.keys(changes as object)).toEqual(["photo_path"]);
      const query = {
        eq: vi.fn(),
        is: vi.fn(),
        select: vi.fn(),
        maybeSingle: mocks.save,
      };
      query.eq.mockReturnValue(query);
      query.is.mockReturnValue(query);
      query.select.mockReturnValue(query);
      return query;
    },
  }));
  mocks.createClient.mockReturnValue({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: mocks.from,
  });
});
it("rejects absent or non-admin sessions before any Storage or row access", async () => {
  expect(
    (await mobilePhotoUpload(request(undefined, "POST", { Authorization: "" })))
      .status,
  ).toBe(401);
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  expect((await mobilePhotoUpload(request())).status).toBe(403);
  expect(mocks.from).not.toHaveBeenCalled();
  expect(mocks.upload).not.toHaveBeenCalled();
});
it("rejects invalid origins, supplied paths, fake images and oversized streams", async () => {
  expect(
    (
      await mobilePhotoUpload(
        request(undefined, "POST", { Origin: "https://evil.example" }),
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await mobilePhotoUpload(
        new Request(
          `https://example.com/api/admin/volei/profile-photo?id=${id}&kind=member&path=private`,
          {
            method: "DELETE",
            headers: { Authorization: "Bearer fake.jwt.token" },
          },
        ),
      )
    ).status,
  ).toBe(400);
  expect((await mobilePhotoUpload(request())).status).toBe(400);
  expect(
    (await mobilePhotoUpload(request(new Uint8Array(1024 * 1024 + 1)))).status,
  ).toBe(413);
  expect(mocks.upload).not.toHaveBeenCalled();
});
it("decodes, strips and resizes images, generates private paths and caches no response", async () => {
  const image = await sharp({
    create: { width: 30, height: 50, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const response = await mobilePhotoUpload(request(image));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toContain("no-store");
  const [path, bytes] = mocks.upload.mock.calls[0];
  expect(path).toMatch(new RegExp(`^members/${id}/.*\\.webp$`));
  expect((await sharp(bytes).metadata()).width).toBe(512);
  expect(mocks.remove).toHaveBeenCalledWith(["members/old.webp"]);
  expect(await response.json()).toEqual({ ok: true });
});
it("deletes a losing upload on conflict without deleting the original photo", async () => {
  mocks.save.mockResolvedValue({ data: null, error: null });
  const image = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "blue" },
  })
    .jpeg()
    .toBuffer();
  expect((await mobilePhotoUpload(request(image))).status).toBe(409);
  expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
  expect(mocks.remove).not.toHaveBeenCalledWith(["members/old.webp"]);
});
it("removes only photo_path, preserving birthday and emergency contact", async () => {
  expect((await mobilePhotoUpload(request(undefined, "DELETE"))).status).toBe(
    200,
  );
  expect(mocks.upload).not.toHaveBeenCalled();
  expect(mocks.remove).toHaveBeenCalledWith(["members/old.webp"]);
});
