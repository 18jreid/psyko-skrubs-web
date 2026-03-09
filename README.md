# Psyko Skrubs

A CS2 gaming group website for tracking player stats, viewing highlights, and managing game requests. Built with Next.js 15, Prisma, SQLite, and Steam OpenID authentication.

**Live site:** [cs.psykostats.com](https://cs.psykostats.com)

---

## Features

- **Steam OpenID sign-in** — no passwords, authenticates directly via Steam
- **Player roster** — K/D ratio, wins, hours played pulled live from Steam API
- **Rankings leaderboard** — sortable by K/D, kills, wins, or hours
- **Allstar.gg clips** — automatically pulls highlight clips for all registered members
- **Game requests** — members can request and vote on games to play together

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Database | SQLite via Prisma 7 + better-sqlite3 |
| Auth | Steam OpenID 2.0 (custom routes) + NextAuth.js v4 |
| Clips | Allstar.gg GraphQL API |
| Stats | Steam Web API (app ID 730) |
| Deployment | Docker → TrueNAS SCALE via GitHub Actions |
| Tunnel | Cloudflare Tunnel → cs.psykostats.com |

---

## Local Development

### Prerequisites

- Node.js 20+
- npm

### 1. Clone the repo

```bash
git clone https://github.com/18jreid/psyko-skrubs-web.git
cd psyko-skrubs-web
git checkout dev
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
STEAM_API_KEY=<your Steam Web API key>
DATABASE_URL=file:./data/psyko-skrubs.db
```

**Getting a Steam API key:** [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)

**Generating a secret:**
```bash
openssl rand -base64 32
```

### 4. Set up the database

```bash
mkdir -p data
npx prisma migrate deploy
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Note:** Steam OpenID allows localhost callbacks so sign-in works locally out of the box.

---

## Project Structure

```
psyko-skrubs-web/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── steam/route.ts          # Steam OpenID redirect
│   │   │   └── steam/callback/route.ts # OpenID callback + JWT creation
│   │   ├── rankings/route.ts           # Rankings API endpoint
│   │   └── user/leetify-token/route.ts # User token management
│   ├── clips/page.tsx                  # Full clips gallery
│   ├── rankings/page.tsx               # Leaderboard page
│   ├── requests/page.tsx               # Game requests page
│   ├── layout.tsx                      # Root layout + Navbar
│   └── page.tsx                        # Home page (roster + clips)
├── components/
│   ├── AllstarClipCard.tsx             # Clip card with thumbnail
│   ├── ClipsFilterBar.tsx              # Client-side filter/sort for clips
│   ├── Navbar.tsx                      # Responsive nav with Steam auth
│   ├── PlayerCard.tsx                  # Player stat card
│   └── RankingsTable.tsx              # Sortable rankings table
├── lib/
│   ├── allstar.ts                      # Allstar.gg GraphQL client
│   ├── auth.ts                         # NextAuth config
│   ├── prisma.ts                       # Prisma client singleton
│   └── steam.ts                        # Steam Web API helpers
├── prisma/
│   ├── migrations/                     # SQL migration history
│   └── schema.prisma                   # Database schema
├── .github/workflows/deploy.yml        # GitHub Actions CI/CD
├── docker-entrypoint.sh                # Container startup (runs migrations)
├── Dockerfile                          # Multi-stage Docker build
├── migrate.js                          # Runtime DB migration (no Prisma CLI needed)
└── prisma.config.ts                    # Prisma configuration
```

---

## Database Schema

```prisma
model User {
  id           String        @id
  steamId      String        @unique
  username     String
  avatar       String
  profileUrl   String
  leetifyToken String?
  createdAt    DateTime      @default(now())
  clips        Clip[]
  gameRequests GameRequest[]
}
```

Migrations run automatically at container startup via `migrate.js`.

**Adding a migration locally:**
```bash
npx prisma migrate dev --name your_migration_name
```

---

## Authentication Flow

Steam uses OpenID 2.0, not OAuth 2.0. The custom flow:

1. User clicks **Sign in with Steam**
2. `/api/auth/steam` → redirects to Steam's OpenID endpoint
3. Steam authenticates → redirects to `/api/auth/steam/callback`
4. Callback verifies the OpenID signature with Steam's servers
5. Steam ID extracted → user upserted in DB
6. NextAuth JWT cookie set manually
7. `useSession()` / `getServerSession()` work normally from here

---

## Branch Strategy

| Branch | Purpose | Reviews required |
|--------|---------|-----------------|
| `main` | Production — auto-deploys to TrueNAS on push | 1 reviewer |
| `dev` | Active development — merge freely | None |

**Typical workflow:**
```bash
# Work on dev
git checkout dev
git pull origin dev

# Make and commit changes
git add .
git commit -m "your change"
git push origin dev

# When ready to ship → open a PR: dev → main on GitHub
```

---

## Deployment

### Automatic (GitHub Actions)

Every push to `main` triggers `.github/workflows/deploy.yml` on a self-hosted runner on TrueNAS:

1. Checks out the code
2. Builds the Docker image (`psyko-skrubs-web:latest`)
3. Runs `docker compose up -d --force-recreate` using the TrueNAS app config

### Production environment variables

Set in the TrueNAS docker-compose (not in the repo) at:
```
/mnt/.ix-apps/app_configs/psyko-skrubs-web/versions/1.0.0/templates/rendered/docker-compose.yaml
```

```yaml
NEXTAUTH_URL: https://cs.psykostats.com
NEXTAUTH_SECRET: <secret>
STEAM_API_KEY: <key>
DATABASE_URL: file:./data/psyko-skrubs.db
NODE_ENV: production
```

### Persistent data

SQLite database is stored on the TrueNAS pool (survives container recreates):
```
/mnt/Pool/ReidNAS/psyko-skrubs-web/data/psyko-skrubs.db
```

### Manual redeploy (no code change)

```bash
ssh truenas_admin@10.0.0.111
sudo docker compose \
  -p ix-psyko-skrubs-web \
  -f /mnt/.ix-apps/app_configs/psyko-skrubs-web/versions/1.0.0/templates/rendered/docker-compose.yaml \
  up -d --force-recreate
```

### Local Docker build (for testing the production image)

```bash
docker build --platform linux/amd64 -t psyko-skrubs-web:latest .

docker run -p 3000:3000 \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXTAUTH_SECRET=your_secret \
  -e STEAM_API_KEY=your_key \
  -e DATABASE_URL=file:./data/psyko-skrubs.db \
  -v $(pwd)/data:/app/data \
  psyko-skrubs-web:latest
```

---

## Key APIs

### Steam Web API
- `GetPlayerSummaries` — avatar, username, profile URL
- `GetUserStatsForGame` (appid=730) — CS2 kills, deaths, wins, time played
- Responses cached 5 minutes via `next: { revalidate: 300 }`

### Allstar.gg GraphQL
- Endpoint: `https://api.prod.allstar.dev/graphql`
- No auth required for public profiles
- Queried by Steam64 ID
- Returns clips with `shareId`, thumbnail, title, game, views

---

## Adding a New Member

Members join by signing in with Steam — no admin invite needed. Once signed in they appear on the roster automatically.

**View current members (via TrueNAS):**
```bash
ssh truenas_admin@10.0.0.111
sudo docker exec ix-psyko-skrubs-web-web-1 node -e "
const Database = require('better-sqlite3');
const db = new Database('/app/data/psyko-skrubs.db');
console.log(db.prepare('SELECT steamId, username, createdAt FROM User').all());
"
```
