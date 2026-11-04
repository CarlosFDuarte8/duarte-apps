import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// All Next processes must read the same ID for this server session.
const output = process.env.VOLLEY_E2E === "1" ? ".next-e2e" : ".next";
mkdirSync(output, { recursive: true });
writeFileSync(join(output, "development-session"), randomUUID());
