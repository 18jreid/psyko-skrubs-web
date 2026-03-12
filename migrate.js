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
        ('psyko_case_v1',     'Psyko Case',           'The original Psyko Skrubs case. Full pool — Mil-Spec to Rare Special.', '📦', 500,   1),
        ('psyko_restricted_v1','Psyko Restricted Case','Guaranteed Restricted or better. Higher floor, bigger rewards.',        '🟣', 1500,  1),
        ('psyko_classified_v1','Psyko Classified Case','Guaranteed Classified or better. Only the finest skins inside.',        '🩷', 5000,  1),
        ('psyko_elite_v1',    'Psyko Elite Case',     'Covert and Rare Special drops only. The rarest of the rare.',           '⭐', 15000, 1);
    `,
  },
  {
    name: "20260311_real_cs2_cases",
    sql: `
      -- Rename case types to match real CS2 cases
      UPDATE "CaseType" SET "name"='Chroma Case',     "description"='Classic 2015 case. Full CS2 odds — knives as rare special.',         "imageEmoji"='🎨' WHERE "id"='psyko_case_v1';
      UPDATE "CaseType" SET "name"='Revolution Case', "description"='Feb 2023 case. Gloves as rare special. Popular skins at every tier.', "imageEmoji"='🌀' WHERE "id"='psyko_restricted_v1';
      UPDATE "CaseType" SET "name"='Recoil Case',     "description"='June 2022 case. Gloves as rare special. Home of USP-S | Printstream.', "imageEmoji"='🎯' WHERE "id"='psyko_classified_v1';
      UPDATE "CaseType" SET "name"='Kilowatt Case',   "description"='First CS2-exclusive case. Kukri Knife as rare special.',             "imageEmoji"='⚡' WHERE "id"='psyko_elite_v1';

      -- Chroma Case items
      INSERT OR IGNORE INTO "CaseItem" ("id","name","rarity","color","emoji","sellValue","weight") VALUES
        ('chr_ms_1','Glock-18 | Catacombs (Field-Tested)',        'mil-spec',     '#4b69ff','🔵',20,   1),
        ('chr_ms_2','MP9 | Deadly Poison (Field-Tested)',          'mil-spec',     '#4b69ff','🔵',20,   1),
        ('chr_ms_3','SCAR-20 | Grotto (Minimal Wear)',             'mil-spec',     '#4b69ff','🔵',25,   1),
        ('chr_ms_4','M249 | System Lock (Field-Tested)',           'mil-spec',     '#4b69ff','🔵',15,   1),
        ('chr_ms_5','XM1014 | Quicksilver (Field-Tested)',         'mil-spec',     '#4b69ff','🔵',20,   1),
        ('chr_r_1', 'Desert Eagle | Naga (Field-Tested)',          'restricted',   '#8847ff','🟣',90,   1),
        ('chr_r_2', 'Sawed-Off | Serenity (Field-Tested)',         'restricted',   '#8847ff','🟣',70,   1),
        ('chr_r_3', 'MAC-10 | Malachite (Minimal Wear)',           'restricted',   '#8847ff','🟣',80,   1),
        ('chr_r_4', 'Dual Berettas | Urban Shock (Field-Tested)',  'restricted',   '#8847ff','🟣',75,   1),
        ('chr_c_1', 'M4A4 | Dragon King (Field-Tested)',           'classified',   '#d32ce6','🩷',420,  1),
        ('chr_c_2', 'AK-47 | Cartel (Field-Tested)',               'classified',   '#d32ce6','🩷',380,  1),
        ('chr_c_3', 'P250 | Muertos (Field-Tested)',               'classified',   '#d32ce6','🩷',350,  1),
        ('chr_cv_1','AWP | Man-o''-war (Field-Tested)',            'covert',       '#eb4b4b','🔴',2200, 1),
        ('chr_cv_2','Galil AR | Chatterbox (Field-Tested)',        'covert',       '#eb4b4b','🔴',1800, 1),
        ('chr_rs_1','★ Karambit | Doppler (Factory New)',          'rare-special', '#ffd700','⭐',12000,1),
        ('chr_rs_2','★ Bayonet | Tiger Tooth (Factory New)',       'rare-special', '#ffd700','⭐',8000, 1);

      -- Revolution Case items
      INSERT OR IGNORE INTO "CaseItem" ("id","name","rarity","color","emoji","sellValue","weight") VALUES
        ('rev_ms_1','MAG-7 | Insomnia (Field-Tested)',             'mil-spec',     '#4b69ff','🔵',75,   1),
        ('rev_ms_2','MP9 | Featherweight (Field-Tested)',           'mil-spec',     '#4b69ff','🔵',80,   1),
        ('rev_ms_3','SCAR-20 | Fragments (Field-Tested)',           'mil-spec',     '#4b69ff','🔵',75,   1),
        ('rev_ms_4','P250 | Re.built (Minimal Wear)',               'mil-spec',     '#4b69ff','🔵',90,   1),
        ('rev_ms_5','MP5-SD | Liquidation (Field-Tested)',          'mil-spec',     '#4b69ff','🔵',80,   1),
        ('rev_ms_6','SG 553 | Cyberforce (Field-Tested)',           'mil-spec',     '#4b69ff','🔵',70,   1),
        ('rev_ms_7','Tec-9 | Rebel (Field-Tested)',                 'mil-spec',     '#4b69ff','🔵',75,   1),
        ('rev_r_1', 'M4A1-S | Emphorosaur-S (Field-Tested)',       'restricted',   '#8847ff','🟣',280,  1),
        ('rev_r_2', 'Glock-18 | Umbral Rabbit (Field-Tested)',     'restricted',   '#8847ff','🟣',240,  1),
        ('rev_r_3', 'MAC-10 | Sakkaku (Field-Tested)',              'restricted',   '#8847ff','🟣',220,  1),
        ('rev_r_4', 'R8 Revolver | Banana Cannon (Minimal Wear)',  'restricted',   '#8847ff','🟣',250,  1),
        ('rev_r_5', 'P90 | Neoqueen (Field-Tested)',                'restricted',   '#8847ff','🟣',300,  1),
        ('rev_c_1', 'AWP | Duality (Field-Tested)',                 'classified',   '#d32ce6','🩷',1300, 1),
        ('rev_c_2', 'UMP-45 | Wild Child (Minimal Wear)',           'classified',   '#d32ce6','🩷',1100, 1),
        ('rev_c_3', 'P2000 | Wicked Sick (Field-Tested)',           'classified',   '#d32ce6','🩷',1200, 1),
        ('rev_cv_1','M4A4 | Temukau (Field-Tested)',                'covert',       '#eb4b4b','🔴',6500, 1),
        ('rev_cv_2','AK-47 | Head Shot (Factory New)',              'covert',       '#eb4b4b','🔴',5500, 1),
        ('rev_rs_1','★ Sport Gloves | Pandora''s Box (FN)',        'rare-special', '#ffd700','⭐',35000,1),
        ('rev_rs_2','★ Hand Wraps | Cobalt Skulls (FN)',           'rare-special', '#ffd700','⭐',25000,1);

      -- Recoil Case items
      INSERT OR IGNORE INTO "CaseItem" ("id","name","rarity","color","emoji","sellValue","weight") VALUES
        ('rec_ms_1','M4A4 | Cyber Security (Field-Tested)',        'mil-spec',     '#4b69ff','🔵',200,  1),
        ('rec_ms_2','P250 | Vino Primo (Field-Tested)',             'mil-spec',     '#4b69ff','🔵',180,  1),
        ('rec_ms_3','FAMAS | Decommissioned (Minimal Wear)',        'mil-spec',     '#4b69ff','🔵',220,  1),
        ('rec_ms_4','G3SG1 | Styx (Field-Tested)',                  'mil-spec',     '#4b69ff','🔵',190,  1),
        ('rec_ms_5','Desert Eagle | Blue Ply (Field-Tested)',       'mil-spec',     '#4b69ff','🔵',210,  1),
        ('rec_ms_6','PP-Bizon | Fuel Rod (Minimal Wear)',           'mil-spec',     '#4b69ff','🔵',175,  1),
        ('rec_ms_7','Nova | Sobek (Field-Tested)',                  'mil-spec',     '#4b69ff','🔵',185,  1),
        ('rec_r_1', 'Glock-18 | Winterized (Field-Tested)',        'restricted',   '#8847ff','🟣',850,  1),
        ('rec_r_2', 'M249 | Downtown (Field-Tested)',               'restricted',   '#8847ff','🟣',750,  1),
        ('rec_r_3', 'MAC-10 | Alloy (Minimal Wear)',                'restricted',   '#8847ff','🟣',780,  1),
        ('rec_r_4', 'R8 Revolver | Crazy 8 (Field-Tested)',        'restricted',   '#8847ff','🟣',900,  1),
        ('rec_r_5', 'M4A1-S | Nightmare (Field-Tested)',            'restricted',   '#8847ff','🟣',820,  1),
        ('rec_c_1', 'AK-47 | Ice Coaled (Field-Tested)',            'classified',   '#d32ce6','🩷',5000, 1),
        ('rec_c_2', 'Sawed-Off | Kiss♥Love (Factory New)',         'classified',   '#d32ce6','🩷',4000, 1),
        ('rec_c_3', 'P250 | Visions (Field-Tested)',                'classified',   '#d32ce6','🩷',4500, 1),
        ('rec_cv_1','USP-S | Printstream (Factory New)',            'covert',       '#eb4b4b','🔴',25000,1),
        ('rec_cv_2','AWP | Chromatic Aberration (Field-Tested)',    'covert',       '#eb4b4b','🔴',15000,1),
        ('rec_rs_1','★ Specialist Gloves | Marble Fade (FN)',      'rare-special', '#ffd700','⭐',120000,1),
        ('rec_rs_2','★ Sport Gloves | Slingshot (Factory New)',    'rare-special', '#ffd700','⭐',80000, 1);

      -- Kilowatt Case items
      INSERT OR IGNORE INTO "CaseItem" ("id","name","rarity","color","emoji","sellValue","weight") VALUES
        ('kw_ms_1','Dual Berettas | Hideout (Field-Tested)',        'mil-spec',     '#4b69ff','🔵',600,   1),
        ('kw_ms_2','MAC-10 | Light Box (Minimal Wear)',              'mil-spec',     '#4b69ff','🔵',650,   1),
        ('kw_ms_3','Nova | Dark Sigil (Field-Tested)',               'mil-spec',     '#4b69ff','🔵',580,   1),
        ('kw_ms_4','SSG 08 | Dezastre (Field-Tested)',               'mil-spec',     '#4b69ff','🔵',620,   1),
        ('kw_ms_5','Tec-9 | Slag (Field-Tested)',                    'mil-spec',     '#4b69ff','🔵',560,   1),
        ('kw_ms_6','UMP-45 | Motorized (Minimal Wear)',              'mil-spec',     '#4b69ff','🔵',640,   1),
        ('kw_ms_7','XM1014 | Irezumi (Field-Tested)',                'mil-spec',     '#4b69ff','🔵',590,   1),
        ('kw_r_1', 'Glock-18 | Block-18 (Factory New)',              'restricted',   '#8847ff','🟣',2800,  1),
        ('kw_r_2', 'M4A4 | Etch Lord (Field-Tested)',                'restricted',   '#8847ff','🟣',2200,  1),
        ('kw_r_3', 'Five-SeveN | Hybrid (Minimal Wear)',             'restricted',   '#8847ff','🟣',2500,  1),
        ('kw_r_4', 'MP7 | Just Smile (Field-Tested)',                'restricted',   '#8847ff','🟣',2000,  1),
        ('kw_r_5', 'Sawed-Off | Analog Input (Factory New)',         'restricted',   '#8847ff','🟣',2400,  1),
        ('kw_c_1', 'M4A1-S | Black Lotus (Factory New)',             'classified',   '#d32ce6','🩷',14000, 1),
        ('kw_c_2', 'Zeus x27 | Olympus (Minimal Wear)',              'classified',   '#d32ce6','🩷',10000, 1),
        ('kw_c_3', 'USP-S | Jawbreaker (Field-Tested)',              'classified',   '#d32ce6','🩷',12000, 1),
        ('kw_cv_1','AK-47 | Inheritance (Factory New)',              'covert',       '#eb4b4b','🔴',70000, 1),
        ('kw_cv_2','AWP | Chrome Cannon (Factory New)',              'covert',       '#eb4b4b','🔴',50000, 1),
        ('kw_rs_1','★ Kukri Knife | Fade (Factory New)',             'rare-special', '#ffd700','⭐',350000,1),
        ('kw_rs_2','★ Kukri Knife | Crimson Web (Factory New)',      'rare-special', '#ffd700','⭐',250000,1);
    `,
  },
  {
    name: "20260311_add_tiered_cases",
    sql: `
      INSERT OR IGNORE INTO "CaseType" ("id","name","description","imageEmoji","price","isActive") VALUES
        ('psyko_restricted_v1','Psyko Restricted Case','Guaranteed Restricted or better. Higher floor, bigger rewards.',  '🟣', 1500,  1),
        ('psyko_classified_v1','Psyko Classified Case','Guaranteed Classified or better. Only the finest skins inside.', '🩷', 5000,  1),
        ('psyko_elite_v1',    'Psyko Elite Case',     'Covert and Rare Special drops only. The rarest of the rare.',    '⭐', 15000, 1);
    `,
  },
  {
    name: "20260312_fix_case_type_names",
    sql: `
      UPDATE "CaseType" SET "name"='Revolution Case', "description"='Feb 2023 case. Gloves as rare special. Popular skins at every tier.', "imageEmoji"='🌀' WHERE "id"='psyko_restricted_v1';
      UPDATE "CaseType" SET "name"='Recoil Case',     "description"='June 2022 case. Gloves as rare special. Home of USP-S | Printstream.', "imageEmoji"='🎯' WHERE "id"='psyko_classified_v1';
      UPDATE "CaseType" SET "name"='Kilowatt Case',   "description"='First CS2-exclusive case. Kukri Knife as rare special.',             "imageEmoji"='⚡' WHERE "id"='psyko_elite_v1';
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
