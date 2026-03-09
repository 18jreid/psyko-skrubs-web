// Applies SQLite migrations using better-sqlite3 directly (no prisma CLI needed)
const Database = require("better-sqlite3");
const path = require("path");

const dbUrl = process.env.DATABASE_URL || "file:./data/psyko-skrubs.db";
const dbPath = dbUrl.replace(/^file:/, "");

const db = new Database(path.resolve(dbPath));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create migrations tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const migrations = [
  {
    name: "20260308235324_init",
    sql: `
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "steamId" TEXT NOT NULL,
        "username" TEXT NOT NULL,
        "avatar" TEXT NOT NULL,
        "profileUrl" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS "Clip" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "platform" TEXT NOT NULL,
        "description" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Clip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "ClipLike" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "clipId" TEXT NOT NULL,
        CONSTRAINT "ClipLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "ClipLike_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "GameRequest" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "steamAppId" TEXT NOT NULL,
        "gameName" TEXT NOT NULL,
        "headerImage" TEXT,
        "description" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "GameRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "GameVote" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "gameRequestId" TEXT NOT NULL,
        "value" INTEGER NOT NULL,
        CONSTRAINT "GameVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "GameVote_gameRequestId_fkey" FOREIGN KEY ("gameRequestId") REFERENCES "GameRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "User_steamId_key" ON "User"("steamId");
      CREATE UNIQUE INDEX IF NOT EXISTS "ClipLike_userId_clipId_key" ON "ClipLike"("userId", "clipId");
      CREATE UNIQUE INDEX IF NOT EXISTS "GameVote_userId_gameRequestId_key" ON "GameVote"("userId", "gameRequestId");
    `,
  },
  {
    name: "20260309004255_add_leetify_token",
    sql: `ALTER TABLE "User" ADD COLUMN "leetifyToken" TEXT;`,
  },
  {
    name: "20260309_add_cs2_elo",
    sql: `ALTER TABLE "User" ADD COLUMN "cs2Elo" INTEGER;`,
  },
  {
    name: "20260309_add_chat",
    sql: `
      CREATE TABLE IF NOT EXISTS "ChatMessage" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `,
  },
  {
    name: "20260309_add_seasons",
    sql: `
      CREATE TABLE IF NOT EXISTS "Season" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "startDate" DATETIME NOT NULL,
        "endDate" DATETIME,
        "isActive" INTEGER NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS "SeasonSnapshot" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "seasonId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "cs2Elo" INTEGER,
        "rank" INTEGER NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SeasonSnapshot_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "SeasonSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "SeasonSnapshot_seasonId_userId_key" ON "SeasonSnapshot"("seasonId", "userId");
    `,
  },
];

for (const migration of migrations) {
  const already = db.prepare("SELECT 1 FROM _migrations WHERE name = ?").get(migration.name);
  if (!already) {
    try {
      db.exec(migration.sql);
      db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(migration.name);
      console.log(`Applied migration: ${migration.name}`);
    } catch (err) {
      // Column already exists etc — non-fatal
      if (!err.message.includes("already exists") && !err.message.includes("duplicate column")) {
        throw err;
      }
      db.prepare("INSERT OR IGNORE INTO _migrations (name) VALUES (?)").run(migration.name);
    }
  }
}

console.log("Migrations complete.");
db.close();
