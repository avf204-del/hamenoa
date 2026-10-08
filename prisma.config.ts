import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url:
      process.env["DATABASE_URL"] ?? "postgres://postgres@127.0.0.1:5433/postgres",
    // מסד עזר למיגרציות (migrate dev / migrate diff --from-migrations):
    // המופע השני של `pnpm db:local:qa`. תוכנו נמחק בכל שימוש — לא מסד עבודה.
    shadowDatabaseUrl:
      process.env["SHADOW_DATABASE_URL"] ??
      "postgres://postgres@127.0.0.1:5434/postgres",
  },
});
