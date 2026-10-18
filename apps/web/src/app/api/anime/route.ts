
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, WatchStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const validStatuses = [
  "PLANNING",
  "WATCHING",
  "COMPLETED",
  "ON_HOLD",
  "DROPPED",
  "REWATCHING",
] as const;

const createSchema = z.object({
  title: z.string().trim().min(1).max(180),
  englishTitle: z.string().max(180).optional().nullable(),
  synopsis: z.string().max(5000).optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
  totalEpisodes: z.number().int().positive().optional().nullable(),
  genres: z.array(z.string()).optional(),
  source: z.string().max(24).optional(),
  sourceId: z.string().max(80).optional().nullable(),
  malId: z.number().int().positive().optional().nullable(),
  status: z.enum(validStatuses).optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedStatus = searchParams.get("status");
    const sort = searchParams.get("sort") ?? "custom";

    const isValidStatus = validStatuses.some(
      (value) => value === requestedStatus
    );

    const where: Prisma.AnimeWhereInput =
      requestedStatus && isValidStatus
        ? { status: requestedStatus as WatchStatus }
        : {};

    const orderBy: Prisma.AnimeOrderByWithRelationInput[] =
      sort === "priority"
        ? [{ priority: "desc" }, { queuePosition: "asc" }]
        : sort === "recent"
          ? [{ updatedAt: "desc" }]
          : [{ queuePosition: "asc" }, { createdAt: "desc" }];

    const anime = await prisma.anime.findMany({
      where,
      orderBy,
      include: {
        episodeLogs: {
          orderBy: { watchedAt: "desc" },
        },
      },
    });

    return NextResponse.json(anime);
  } catch (error: unknown) {
    console.error("Anime retrieval failed:", error);

    return NextResponse.json(
      { error: "Could not retrieve anime. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid anime data.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    if (data.sourceId && data.source) {
      const existing = await prisma.anime.findFirst({
        where: {
          source: data.source,
          sourceId: data.sourceId,
        },
      });

      if (existing) {
        return NextResponse.json(existing, { status: 200 });
      }
    }

    const last = await prisma.anime.aggregate({
      _max: { queuePosition: true },
    });

    const anime = await prisma.anime.create({
      data: {
        title: data.title,
        englishTitle: data.englishTitle ?? null,
        synopsis: data.synopsis ?? null,
        coverImage: data.coverImage ?? null,
        totalEpisodes: data.totalEpisodes ?? null,
        genres: (data.genres ?? []).join(", "),
        source: data.source ?? "MANUAL",
        sourceId: data.sourceId ?? null,
        malId: data.malId ?? null,
        status: data.status ?? "PLANNING",
        queuePosition: (last._max.queuePosition ?? 0) + 1,
      },
    });

    return NextResponse.json(anime, { status: 201 });
  } catch (error: unknown) {
    console.error("Anime creation failed:", error);

    return NextResponse.json(
      { error: "Could not create anime. Please try again." },
      { status: 500 }
    );
  }
}
