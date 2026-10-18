-- CreateTable
CREATE TABLE "Anime" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "englishTitle" TEXT,
    "nativeTitle" TEXT,
    "synopsis" TEXT,
    "coverImage" TEXT,
    "bannerImage" TEXT,
    "genres" TEXT NOT NULL DEFAULT '',
    "seasonCount" INTEGER NOT NULL DEFAULT 1,
    "totalEpisodes" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "queuePosition" INTEGER NOT NULL DEFAULT 0,
    "currentSeason" INTEGER NOT NULL DEFAULT 1,
    "currentEpisode" INTEGER NOT NULL DEFAULT 0,
    "userRating" INTEGER,
    "personalNotes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceId" TEXT,
    "malId" INTEGER,
    "rewatchCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EpisodeLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "animeId" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL DEFAULT 1,
    "episodeNumber" INTEGER NOT NULL,
    "watchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" INTEGER,
    "notes" TEXT,
    "rewatch" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EpisodeLog_animeId_fkey"
        FOREIGN KEY ("animeId")
        REFERENCES "Anime" ("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Anime_status_queuePosition_idx"
ON "Anime"("status", "queuePosition");

-- CreateIndex
CREATE INDEX "Anime_title_idx"
ON "Anime"("title");

-- CreateIndex
CREATE UNIQUE INDEX "Anime_source_sourceId_key"
ON "Anime"("source", "sourceId");

-- CreateIndex
CREATE INDEX "EpisodeLog_animeId_watchedAt_idx"
ON "EpisodeLog"("animeId", "watchedAt");

-- CreateIndex
CREATE INDEX "EpisodeLog_animeId_seasonNumber_episodeNumber_idx"
ON "EpisodeLog"("animeId", "seasonNumber", "episodeNumber");