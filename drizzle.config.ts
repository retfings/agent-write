import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./backend/db/schema.ts",
  dbCredentials: {
    url: "./backend/data/novel.db",
  },
});