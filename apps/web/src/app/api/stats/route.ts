
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [anime, episodeLogs, ratedLogs] = await Promise.all([
      prisma.anime.findMany({
        select: {
          status: true,
          rewatchCount: true,
        },
      }),

      prisma.episodeLog.findMany({
        select: {
          rewatch: true,
        },
      }),

      prisma.episodeLog.findMany({
        where: {
          rating: {
            not: null,
          },
        },
        select: {
          rating: true,
        },
      }),
    ]);

    const completed = anime.filter(
      (item) => item.status === "COMPLETED"
    ).length;

    const watching = anime.filter(
      (item) =>
        item.status === "WATCHING" ||
        item.status === "REWATCHING"
    ).length;

    const planned = anime.filter(
      (item) => item.status === "PLANNING"
    ).length;

    const rewatches = episodeLogs.filter(
      (log) => log.rewatch
    ).length;

    const ratings = ratedLogs
      .map((log) => log.rating)
      .filter((rating): rating is number => rating !== null);

    const averageEpisodeRating =
      ratings.length > 0
        ? Math.round(
            (ratings.reduce((sum, rating) => sum + rating, 0) /
              ratings.length) *
              10
          ) / 10
        : null;

    const animeRewatchCount = anime.reduce(
      (sum, item) => sum + item.rewatchCount,
      0
    );

    return NextResponse.json({
      animeCount: anime.length,
      watching,
      completed,
      planned,
      episodeLogs: episodeLogs.length,
      firstWatches: episodeLogs.length - rewatches,
      rewatchLogs: rewatches,
      averageEpisodeRating,
      animeRewatchCount,
    });
  } catch (error: unknown) {
    console.error("Stats query failed:", error);

    return NextResponse.json(
      { error: "Could not calculate library statistics." },
      { status: 500 }
    );
  }
}
