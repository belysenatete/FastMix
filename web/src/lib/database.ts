import postgres from "postgres";

const globalForPostgres = globalThis as typeof globalThis & { fastmixSql?: ReturnType<typeof postgres> };

export function sqlClient() {
  if (!process.env.DATABASE_URL) return null;
  if (!globalForPostgres.fastmixSql) {
    globalForPostgres.fastmixSql = postgres(process.env.DATABASE_URL, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 5,
      transform: postgres.camel,
    });
  }
  return globalForPostgres.fastmixSql;
}
