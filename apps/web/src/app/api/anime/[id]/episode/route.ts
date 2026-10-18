
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  seasonNumber: z.number().int().positive().default(1),
  episodeNumber: z.number().int().positive(),
  watchedAt: z.string().datetime().optional(),
  rating: z.number().int().min(1).max(10).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  rewatch: z.boolean().default(false),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  const { id } = await params;

  try {
    const anime = await prisma.anime.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!anime) {
      return NextResponse.json(
        { error: "Anime not found" },
        { status: 404 }
      );
    }

    const logs = await prisma.episodeLog.findMany({
      where: { animeId: id },
      orderBy: [
        { watchedAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 500,
    });

    return NextResponse.json(logs);
  } catch (error: unknown) {
    console.error("Episode history retrieval failed:", error);

    return NextResponse.json(
      { error: "Could not retrieve episode history." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  const { id } = await params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid episode record.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const input = parsed.data;

  try {
    const anime = await prisma.anime.findUnique({
      where: { id },
    });

    if (!anime) {
      return NextResponse.json(
        { error: "Anime not found." },
        { status: 404 }
      );
    }

    if (
      anime.totalEpisodes != null &&
      input.seasonNumber === 1 &&
      input.episodeNumber > anime.totalEpisodes
    ) {
      return NextResponse.json(
        {
          error: `Episode number exceeds the listed total of ${anime.totalEpisodes}. If this is a later season, update the anime's season details first.`,
        },
        { status: 400 }
      );
    }

    // Prevent duplicate normal watches while allowing rewatches.
    if (!input.rewatch) {
      const existing = await prisma.episodeLog.findFirst({
        where: {
          animeId: id,
          seasonNumber: input.seasonNumber,
          episodeNumber: input.episodeNumber,
          rewatch: false,
        },
        select: { id: true },
      });

      if (existing) {
        return NextResponse.json(
          {
            error:
              "This episode is already in your watch history. Record it as a rewatch if you watched it again.",
          },
          { status: 409 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.episodeLog.create({
        data: {
          animeId: id,
          seasonNumber: input.seasonNumber,
          episodeNumber: input.episodeNumber,
          watchedAt: input.watchedAt
            ? new Date(input.watchedAt)
            : new Date(),
          rating: input.rating ?? null,
          notes: input.notes ?? null,
          rewatch: input.rewatch,
        },
      });

      const normalLogs = await tx.episodeLog.findMany({
        where: {
          animeId: id,
          rewatch: false,
        },
        select: {
          seasonNumber: true,
          episodeNumber: true,
        },
      });

      const watchedEpisodes = new Set(
        normalLogs.map(
          (episode) =>
            `${episode.seasonNumber}:${episode.episodeNumber}`
        )
      );

      const isFinished =
        anime.totalEpisodes != null &&
        watchedEpisodes.size >= anime.totalEpisodes;

      const nextEpisode = input.episodeNumber + 1;

      await tx.anime.update({
        where: { id },
        data: {
          currentSeason: input.seasonNumber,
          currentEpisode: nextEpisode,
          status: input.rewatch
            ? "REWATCHING"
            : isFinished
              ? "COMPLETED"
              : "WATCHING",
          startedAt: anime.startedAt ?? new Date(),
          completedAt:
            isFinished && !input.rewatch
              ? new Date()
              : null,
        },
      });

      return log;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error("Episode log creation failed:", error);

    return NextResponse.json(
      {
        error:
          "Could not save the episode. Please try again.",
      },
      { status: 500 }
    );
  }
}
