import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const db = new PGlite();
const link = "https://chat.whatsapp.com/AbC123def456";
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    grant usage on schema public to anon, authenticated, service_role;
    create function public.is_volei_admin() returns boolean language sql as $$
      select coalesce(current_setting('test.admin',true),'false')='true' $$;`);
  await db.exec(await readFile(new URL("./migrations/202611170001_volei_whatsapp_group.sql", import.meta.url), "utf8"));
}, 60000);
beforeEach(async () => {
  await db.exec("reset role; set test.admin='false'; update volei_group_settings set whatsapp_invite_url=null;");
});
afterAll(() => db.close());

it("publishes only an optional invitation and denies anonymous writes", async () => {
  await db.query("update volei_group_settings set whatsapp_invite_url=$1", [link]);
  await db.exec("set role anon");
  expect((await db.query("select whatsapp_invite_url from volei_group_settings")).rows).toEqual([{ whatsapp_invite_url: link }]);
  await expect(db.query("update volei_group_settings set whatsapp_invite_url=null")).rejects.toThrow(/permission denied/);
});
it("authenticated non-admins cannot modify the invitation", async () => {
  await db.exec("set role authenticated");
  expect((await db.query("update volei_group_settings set whatsapp_invite_url=$1 returning id", [link])).rows).toEqual([]);
});
it("allows an administrator to save, replace and hide the invitation", async () => {
  await db.exec("set test.admin='true'; set role authenticated");
  for (const value of [link, "https://chat.whatsapp.com/Replacement123", null]) {
    expect((await db.query("update volei_group_settings set whatsapp_invite_url=$1 returning whatsapp_invite_url", [value])).rows)
      .toEqual([{ whatsapp_invite_url: value }]);
  }
});
it("enforces the destination in PostgreSQL and keeps the singleton row", async () => {
  await db.exec("set test.admin='true'; set role authenticated");
  await expect(db.query("update volei_group_settings set whatsapp_invite_url='https://evil.example/invite'")).rejects.toThrow(/check constraint/);
  await expect(db.query("update volei_group_settings set id=false")).rejects.toThrow(/permission denied/);
  await expect(db.query("delete from volei_group_settings")).rejects.toThrow(/permission denied/);
  await expect(db.query("insert into volei_group_settings(id) values(false)")).rejects.toThrow(/permission denied/);
});
