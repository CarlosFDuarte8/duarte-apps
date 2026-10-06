import { createHash } from "node:crypto";

export type MigrationFile = { name: string; sql: string };
export type MigrationConnection = {
  query: (
    sql: string,
    parameters?: string[],
  ) => Promise<{ rows: { checksum?: string }[] }>;
};

/** Um lote atômico: falhas revertem tanto o SQL quanto o controle de versões. */
export async function runMigrations(
  connection: MigrationConnection,
  files: MigrationFile[],
) {
  const applied: string[] = [];
  await connection.query("begin");
  try {
    await connection.query("select pg_advisory_xact_lock(813479235)");
    await connection.query("create schema if not exists incra_migrations");
    await connection.query(
      "revoke all on schema incra_migrations from public, anon, authenticated",
    );
    await connection.query(`create table if not exists incra_migrations.applied (
      name text primary key, checksum text not null, applied_at timestamptz not null default now()
    )`);
    for (const file of files) {
      const checksum = createHash("sha256")
        .update(file.sql.replace(/\r\n/g, "\n"))
        .digest("hex");
      const existing = await connection.query(
        "select checksum from incra_migrations.applied where name=$1",
        [file.name],
      );
      if (existing.rows.length) {
        if (existing.rows[0].checksum !== checksum)
          throw new Error(
            `Arquivo já aplicado foi modificado: ${file.name}. Crie uma nova migration.`,
          );
        continue;
      }
      // seed.sql também pode ser usado isoladamente no SQL Editor.
      // Aqui a transação pertence ao runner, incluindo seu registro de aplicação.
      const sql = file.sql
        .replace(/^begin;\s*$/gim, "")
        .replace(/^commit;\s*$/gim, "");
      await connection.query(sql);
      await connection.query(
        "insert into incra_migrations.applied(name,checksum) values($1,$2)",
        [file.name, checksum],
      );
      applied.push(file.name);
    }
    await connection.query("commit");
    return applied;
  } catch (error) {
    await connection.query("rollback");
    throw error;
  }
}
