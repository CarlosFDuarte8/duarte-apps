import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transpileModule, ModuleKind } from "typescript";
import * as zod from "zod";
import * as profile from "./profile";
import * as students from "./students";
import * as phone from "./phone";
import * as domain from "./domain";

const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function fixture(
  error: { code?: string; message?: string } | null = null,
  authorized = true,
) {
  const calls: { method: string; args: Record<string, unknown> }[] = [];
  const invalidations: string[] = [];
  const exports: {
    addMember?: (name: string, phone: string, enrollment: unknown, birthDate?: string) => Promise<{ error: string }>;
    addAdminGuest?: (
      event: string,
      member: string,
      name: string,
    ) => Promise<{ error: string; status?: string; name?: string }>;
  } = {};
  runInNewContext(
    transpileModule(readFileSync("src/app/admin/volei-actions.ts", "utf8"), {
      compilerOptions: { module: ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require(name: string) {
        if (name === "zod") return zod;
        if (name === "next/cache")
          return { revalidatePath: (path: string) => invalidations.push(path) };
        if (name === "@/lib/volei/auth")
          return {
            requireVoleiAdmin: async () => {
              if (!authorized) throw new Error("Acesso restrito");
              return {
                client: {
                  from: () => ({ insert: async (args: Record<string, unknown>) => {
                    calls.push({ method: "insert", args });
                    return { error };
                  } }),
                  rpc: async (method: string, args: Record<string, string>) => {
                    calls.push({ method, args });
                    return {
                      error,
                      data: { status: "confirmado", name: args.p_name },
                    };
                  },
                },
              };
            },
          };
        if (name === "@/lib/volei/profile") return profile;
        if (name === "@/lib/volei/students") return students;
        if (name === "@/lib/volei/phone") return phone;
        if (name === "@/lib/volei/domain") return domain;
        if (
          [
            "@/lib/volei/students",
            "@/lib/volei/phone",
            "@/lib/volei/photos",
            "@/lib/volei/frequency",
            "@/lib/volei/domain",
          ].includes(name)
        )
          return {};
        throw new Error(`Unexpected dependency: ${name}`);
      },
    },
  );
  return { add: exports.addAdminGuest!, addMember: exports.addMember!, calls, invalidations };
}

it("requires birth date for administrative registrations and preserves authorization", async () => {
  const denied = fixture(null, false);
  await expect(denied.addMember("Nome completo", "", {}, "2010-05-10")).rejects.toThrow(/restrito/);
  const api = fixture();
  const enrollment = { isStudent: false, days: [] };
  for (const birth of [undefined, "", "2099-01-01", "2008-02-30"])
    expect((await api.addMember("Nome completo", "", enrollment, birth)).error).toBeTruthy();
  expect(api.calls).toHaveLength(0);
  expect(await api.addMember("Nome completo", "(61) 99999-1234", enrollment, "2010-05-10")).toEqual({ error: "" });
  expect(api.calls[0].args).toMatchObject({ birth_date: "2010-05-10", phone: "+5561999991234", membership_status: "approved" });
});

it("adds an administrative guest with the selected sponsor through the existing atomic RPC", async () => {
  const api = fixture();
  const result = await api.add(id(1), id(2), "  Visitante de hoje  ");
  expect(result).toEqual({
    error: "",
    status: "confirmado",
    name: "Visitante de hoje",
  });
  expect(api.calls).toEqual([
    {
      method: "volei_admin_add_guest",
      args: { p_event: id(1), p_member: id(2), p_name: "Visitante de hoje" },
    },
  ]);
  expect(api.invalidations).toContain("/admin/volei");
});
it("requires admin and validates identifiers and name before writing", async () => {
  const denied = fixture(null, false);
  await expect(denied.add(id(1), id(2), "Visitante")).rejects.toThrow(
    "Acesso restrito",
  );
  expect(denied.calls).toHaveLength(0);
  const api = fixture();
  expect((await api.add("invalid", id(2), "Visitante")).error).not.toBe("");
  expect((await api.add(id(1), id(2), "   ")).error).not.toBe("");
  expect(api.calls).toHaveLength(0);
});
it("explains missing server support and never retries an uncertain write", async () => {
  const missing = fixture({ code: "PGRST202" });
  expect((await missing.add(id(1), id(2), "Visitante")).error).toContain(
    "migration",
  );
  expect(missing.calls).toHaveLength(1);
  expect(missing.invalidations).toHaveLength(0);
  const network = fixture({ message: "Network error" });
  expect((await network.add(id(1), id(2), "Visitante")).error).not.toBe("");
  expect(network.calls).toHaveLength(1);
});
