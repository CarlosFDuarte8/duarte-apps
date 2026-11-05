import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import { transpileModule, ModuleKind, JsxEmit } from "typescript";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as domain from "../src/lib/volei/domain";

const nodeRequire = createRequire(`${process.cwd()}/package.json`);
const component: { EventManager?: ComponentType<Record<string, unknown>> } = {};
runInNewContext(
  transpileModule(
    readFileSync("src/components/volei/event-manager.tsx", "utf8"),
    {
      compilerOptions: { module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX },
    },
  ).outputText,
  {
    exports: component,
    require(name: string) {
      if (name === "react" || name === "react/jsx-runtime")
        return nodeRequire(name);
      if (name === "@/lib/volei/domain") return domain;
      if (name === "@/lib/volei/gate-list") return { buildGateList: () => [] };
      if (name === "./use-run")
        return {
          useRun: () => ({ pending: false, feedback: null, run() {} }),
          useCopy: () => ({ copied: false, copy() {} }),
        };
      if (name === "next/navigation")
        return { useRouter: () => ({ push() {} }) };
      if (name === "@/lib/volei/phone")
        return { defaultDeadline: () => "2026-11-04T18:00:00-03:00" };
      if (name === "@/components/ui/native-select")
        return {
          NativeSelect: (props: Record<string, unknown>) =>
            createElement("select", props),
        };
      if (name === "@/app/admin/volei-actions" || name.endsWith(".css"))
        return {};
      throw new Error(`Unexpected component dependency: ${name}`);
    },
  },
);
const markup = renderToStaticMarkup(
  createElement(component.EventManager!, {
    event: {
      id: "event",
      date: "2026-11-04",
      title: "Vôlei",
      start_time: "19h",
      location: "COP",
      notes: "",
      closed: false,
    },
    members: [
      {
        id: "member",
        name: "Participante de exemplo",
        is_active: true,
        membership_status: "approved",
        blocked: false,
      },
    ],
    attendance: [{ member_id: "member", status: "confirmado" }],
    guests: [],
  }),
);
const baseCSS = [
  "src/components/escalas/escalas.css",
  "src/components/volei/shell.css",
  "src/components/volei/mobile.css",
  "src/components/volei/theme.css",
  "src/components/volei/volei.css",
]
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
const themeCSS = readFileSync("src/components/volei/color-mode.css", "utf8");

for (const width of [390, 1280]) {
  for (const theme of ["light", "dark"]) {
    for (const order of ["theme-last", "legacy-last"]) {
      test(`${width}px ${theme} ${order}: actual admin table and checkbox respect the theme`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        const styles =
          order === "theme-last" ? baseCSS + themeCSS : themeCSS + baseCSS;
        await page.setContent(
          `<html data-volley-theme="${theme}"><head><meta charset="utf-8"><style>body{margin:0}${styles}</style></head><body><main class="sc"><div class="volley-app"><div class="volley-body"><div class="volley-content">${markup}</div></div></div></main></body></html>`,
        );
        const table = page.locator(".vl-attendance-table");
        const check = page.locator("label.sc-check");
        await table.scrollIntoViewIfNeeded();
        const surface =
          theme === "dark" ? "rgb(16, 39, 59)" : "rgb(255, 255, 255)";
        const ink = theme === "dark" ? "rgb(250, 250, 250)" : "rgb(0, 31, 59)";
        await expect(table).toHaveCSS("background-color", surface);
        await expect(table.locator("tbody tr")).toHaveCSS(
          "background-color",
          surface,
        );
        await expect(table.locator("tbody td").first()).toHaveCSS(
          "background-color",
          surface,
        );
        await expect(table.locator("tbody td").first()).toHaveCSS("color", ink);
        await expect(check).toHaveCSS("background-color", surface);
        await expect(check).toHaveCSS("color", ink);
        await check.locator("input").check();
        await expect(check).toHaveCSS(
          "background-color",
          theme === "dark" ? "rgb(23, 52, 77)" : "rgb(237, 244, 251)",
        );
        await expect(check).toHaveCSS("color", ink);
        if (width === 1280) {
          await expect(table).toHaveCSS("display", "table");
          const coverage = await table.evaluate(
            (element) =>
              element.querySelector("tbody")!.getBoundingClientRect().width /
              element.getBoundingClientRect().width,
          );
          expect(coverage).toBeGreaterThan(0.95);
        }
        await page.screenshot({
          path: testInfo.outputPath("admin-presence.png"),
          fullPage: true,
        });
      });
    }
  }
}
