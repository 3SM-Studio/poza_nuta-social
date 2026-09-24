import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { publicPaths } from "./public-paths";

describe("analytics path contract parity", () => {
  it("keeps the SQL page allowlist equal to the SEO and analytics source", () => {
    const migrations = join(process.cwd(), "supabase", "migrations");
    const file = readdirSync(migrations).find((name) => name.endsWith("_legal_privacy_canonical_path.sql"));
    expect(file).toBeDefined();
    const sql = readFileSync(join(migrations, file!), "utf8");
    const ingestionMigration = readFileSync(join(migrations, readdirSync(migrations).find((name) => name.endsWith("_analytics_public_page_paths.sql"))!), "utf8");
    const list = sql.match(/select p_path in \(([^)]+)\)/)?.[1];
    expect(list).toBeDefined();
    const sqlPaths = [...list!.matchAll(/'([^']+)'/g)].map((match) => match[1]);
    expect(sqlPaths).toEqual([...publicPaths]);
    expect(sql).toContain("public.analytics_valid_event_path_v1(path)");
    expect(sql).toContain("id <= %s");
    expect(ingestionMigration).toContain("if not public.analytics_valid_event_path_v1(p_path) then raise exception 'invalid_path'");
    expect(sql).not.toContain("alter table public.tracking_links");
  });
});
