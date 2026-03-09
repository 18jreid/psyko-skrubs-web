import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

function createPrismaClient() {
  const rawUrl = process.env.DATABASE_URL ?? "file:./data/psyko-skrubs.db";

  // Extract file path from the URL
  let dbPath: string;
  if (rawUrl.startsWith("file:")) {
    const filePath = rawUrl.replace("file:", "");
    // Resolve relative paths from cwd
    dbPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);
  } else {
    dbPath = rawUrl;
  }

  const adapter = new PrismaBetterSqlite3({ url: dbPath });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
