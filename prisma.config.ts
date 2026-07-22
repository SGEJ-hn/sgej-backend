import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Usamos DIRECT_URL (puerto 5432) para las operaciones de CLI y migraciones de Prisma
    url: env("DIRECT_URL"),
  },
});