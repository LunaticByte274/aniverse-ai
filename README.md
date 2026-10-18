# ANIVERSE AI — anime tracker starter

A polished Next.js starter focused on a working personal anime library, queue, and persistent episode history. The first milestone is the tracker; lore Q&A and deeper AI tools are intentionally future phases.

## Requirements

- Node.js 20.9+ (Node 22 LTS recommended)
- Corepack-enabled Yarn (the project declares Yarn 4.1.0)

## Run locally (macOS / Linux)

```bash
cd aniverse-ai
corepack enable
corepack yarn install
cp apps/web/.env.example apps/web/.env
corepack yarn db:generate
corepack yarn workspace @aniverse/web prisma migrate dev --name init
corepack yarn dev
```

Open http://localhost:3000. The database file is `apps/web/prisma/dev.db`; it survives restarts. Back it up before deleting or replacing it.

If your shell is already in the project root, do not run `cd aniverse-ai` again. If you use npm instead of Yarn, avoid mixing package managers in this workspace.

## Features in this starter

- Add anime from AniList search or manually.
- Persistent library and statuses: planning, watching, completed, on hold, dropped, rewatching.
- Manual episode logging with watched date, episode rating, and notes.
- Queue priority levels and custom ordering controls.
- Anime-level rating, notes fields in the API/schema, rewatch flag/count, and recent episode history.
- Search/filter/sort library and a responsive dark violet/blue interface.
- Validated API payloads and Prisma-backed storage.

## MyAnimeList imports

This starter preserves AniList's MyAnimeList ID when AniList provides one. Direct MyAnimeList account sync is **not** configured. Add it as a separate integration after choosing an authorized route (for example, user-export import or official API OAuth); do not collect a user's MAL password.

## Data and production notes

- SQLite is chosen for a zero-service local setup and durable local development. The current schema is not yet multi-user; do not deploy it as a public multi-user service without adding authentication, ownership scoping, request rate limits, and a production database/backup strategy.
- For production, migrate Prisma to PostgreSQL and use a managed database with backups. Vercel's ephemeral filesystem is not suitable for a persistent SQLite database.
- AniList search requires internet access. Anime images are loaded from AniList/CDN URLs.
- This project does not scrape streaming services or automatically detect playback. Manual tracking is implemented; playback integrations are a future opt-in.

## Useful commands

```bash
corepack yarn dev
corepack yarn build
corepack yarn db:studio
corepack yarn workspace @aniverse/web prisma migrate dev --name describe-your-change
```

## Planned next milestones

1. Authentication and per-user libraries.
2. Full episode catalogue/season model for specials, OVAs, movies, and multi-cour seasons.
3. Safe MyAnimeList import/export flow.
4. Airing calendar and metadata refresh jobs.
5. Evidence-backed anime Q&A with citations and spoiler-progress controls.
6. Tests, production PostgreSQL, deployment and monitoring.
