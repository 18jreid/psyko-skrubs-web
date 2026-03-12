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
  {
    name: "20260309_add_gaming_sessions",
    sql: `
      CREATE TABLE IF NOT EXISTS "GamingSession" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "game" TEXT NOT NULL,
        "scheduledAt" DATETIME NOT NULL,
        "createdById" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "GamingSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "SessionRsvp" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SessionRsvp_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GamingSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "SessionRsvp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "SessionRsvp_sessionId_userId_key" ON "SessionRsvp"("sessionId", "userId");
    `,
  },
  {
    name: "20260309_add_achievements",
    sql: `
      CREATE TABLE IF NOT EXISTS "Achievement" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "value" REAL NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "Achievement_userId_type_key" ON "Achievement"("userId", "type");
    `,
  },
  {
    name: "20260309_add_notifications",
    sql: `
      CREATE TABLE IF NOT EXISTS "Notification" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "read" INTEGER NOT NULL DEFAULT 0,
        "refId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `,
  },
  {
    name: "20260309_add_clip_votes",
    sql: `
      CREATE TABLE IF NOT EXISTS "ClipVote" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "shareId" TEXT NOT NULL,
        "value" INTEGER NOT NULL,
        CONSTRAINT "ClipVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "ClipVote_userId_shareId_key" ON "ClipVote"("userId", "shareId");
    `,
  },
  {
    name: "20260309_add_cases",
    sql: `
      ALTER TABLE "User" ADD COLUMN "balance" INTEGER NOT NULL DEFAULT 1000;

      CREATE TABLE IF NOT EXISTS "CaseItem" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "rarity" TEXT NOT NULL,
        "color" TEXT NOT NULL,
        "emoji" TEXT NOT NULL,
        "sellValue" INTEGER NOT NULL,
        "weight" INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "UserItem" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "itemId" TEXT NOT NULL,
        "sold" INTEGER NOT NULL DEFAULT 0,
        "obtainedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "UserItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CaseItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );

      INSERT OR IGNORE INTO "CaseItem" ("id","name","rarity","color","emoji","sellValue","weight") VALUES
        ('ms_1','AK-47 | Redline (Battle-Scarred)','mil-spec','#4b69ff','🔵',50,1600),
        ('ms_2','M4A4 | Howl Wannabe (Field-Tested)','mil-spec','#4b69ff','🔵',50,1600),
        ('ms_3','AWP | Dragon Snore (Worn)','mil-spec','#4b69ff','🔵',50,1600),
        ('ms_4','Glock-18 | Fade Attempt (Battle-Scarred)','mil-spec','#4b69ff','🔵',50,1600),
        ('ms_5','MP5-SD | Lab Rats (Minimal Wear)','mil-spec','#4b69ff','🔵',50,1590),
        ('r_1','AK-47 | Vulcan (Field-Tested)','restricted','#8847ff','🟣',150,400),
        ('r_2','M4A1-S | Cyrex (Minimal Wear)','restricted','#8847ff','🟣',150,400),
        ('r_3','AWP | Asiimov (Battle-Scarred)','restricted','#8847ff','🟣',150,400),
        ('r_4','USP-S | Orion (Factory New)','restricted','#8847ff','🟣',150,390),
        ('c_1','AK-47 | Fire Serpent (Field-Tested)','classified','#d32ce6','🩷',400,110),
        ('c_2','StatTrak™ M4A4 | Howl (Battle-Scarred)','classified','#d32ce6','🩷',400,110),
        ('c_3','Karambit | Doppler (Minimal Wear)','classified','#d32ce6','🩷',400,100),
        ('cv_1','AWP | Dragon Lore (Factory New)','covert','#eb4b4b','🔴',1200,34),
        ('cv_2','StatTrak™ Butterfly Knife | Fade','covert','#eb4b4b','🔴',1200,30),
        ('rs_1','★ Psyko Knife | Crimson Web','rare-special','#ffd700','⭐',5000,14),
        ('rs_2','★ StatTrak™ Karambit | Case Hardened','rare-special','#ffd700','⭐',5000,12);
    `,
  },
  {
    name: "20260309_add_market",
    sql: `
      CREATE TABLE IF NOT EXISTS "MarketListing" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sellerId" TEXT NOT NULL,
        "userItemId" TEXT NOT NULL,
        "itemId" TEXT NOT NULL,
        "price" INTEGER NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'active',
        "buyerId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "soldAt" DATETIME,
        CONSTRAINT "MarketListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id"),
        CONSTRAINT "MarketListing_userItemId_fkey" FOREIGN KEY ("userItemId") REFERENCES "UserItem" ("id"),
        CONSTRAINT "MarketListing_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CaseItem" ("id"),
        CONSTRAINT "MarketListing_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "MarketListing_userItemId_key" ON "MarketListing"("userItemId");
    `,
  },
  {
    name: "20260311_add_purchasable_cases",
    sql: `
      CREATE TABLE IF NOT EXISTS "CaseType" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "imageEmoji" TEXT NOT NULL DEFAULT '📦',
        "price" INTEGER NOT NULL,
        "isActive" INTEGER NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "UserCase" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "caseTypeId" TEXT NOT NULL,
        "opened" INTEGER NOT NULL DEFAULT 0,
        "obtainedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "UserCase_caseTypeId_fkey" FOREIGN KEY ("caseTypeId") REFERENCES "CaseType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "CaseMarketListing" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sellerId" TEXT NOT NULL,
        "userCaseId" TEXT NOT NULL,
        "caseTypeId" TEXT NOT NULL,
        "price" INTEGER NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'active',
        "buyerId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "soldAt" DATETIME,
        CONSTRAINT "CaseMarketListing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User" ("id"),
        CONSTRAINT "CaseMarketListing_userCaseId_fkey" FOREIGN KEY ("userCaseId") REFERENCES "UserCase" ("id"),
        CONSTRAINT "CaseMarketListing_caseTypeId_fkey" FOREIGN KEY ("caseTypeId") REFERENCES "CaseType" ("id"),
        CONSTRAINT "CaseMarketListing_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id")
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "CaseMarketListing_userCaseId_key" ON "CaseMarketListing"("userCaseId");

      INSERT OR IGNORE INTO "CaseType" ("id","name","description","imageEmoji","price","isActive") VALUES
        ('psyko_case_v1','Psyko Case','The original Psyko Skrubs case. Contains 16 exclusive skins.','📦',500,1);
    `,
  },
  {
    name: "20260311_add_discord_rewards",
    sql: `
      ALTER TABLE "User" ADD COLUMN "discordId" TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS "User_discordId_key" ON "User"("discordId");

      CREATE TABLE IF NOT EXISTS "DiscordLinkCode" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "code" TEXT NOT NULL,
        "expiresAt" DATETIME NOT NULL,
        CONSTRAINT "DiscordLinkCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
        UNIQUE("userId"),
        UNIQUE("code")
      );

      CREATE TABLE IF NOT EXISTS "VoiceReward" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "coins" INTEGER NOT NULL,
        "minutes" INTEGER NOT NULL,
        "awardedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "VoiceReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
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
