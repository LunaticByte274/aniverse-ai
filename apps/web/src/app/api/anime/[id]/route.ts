
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateSchema = z
  .object({
    status: z
      .enum([
        "PLANNING",
        "WATCHING",
        "COMPLETED",
        "ON_HOLD",
        "DROPPED",
        "REWATCHING",
      ])
      .optional(),

    priority: z
      .enum(["LOW", "NORMAL", "HIGH", "MUST_WATCH"])
      .optional(),

    queuePosition: z.number().int().optional(),

    currentSeason: z.number().int().positive().optional(),

    currentEpisode: z.number().int().min(0).optional(),

    userRating: z.number().int().min(1).max(10).nullable().optional(),

    personalNotes: z.string().max(5000).nullable().optional(),

    rewatchCount: z.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for an update.",
  });

export async function PATCH(
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

  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid update.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const current = await prisma.anime.findUnique({
      where: { id },
    });

    if (!current) {
      return NextResponse.json(
        { error: "Anime not found." },
        { status: 404 }
      );
    }

    const data = { ...parsed.data };

    if (data.status === "WATCHING" && !current.startedAt) {
      Object.assign(data, { startedAt: new Date() });
    }

    if (data.status === "COMPLETED") {
      Object.assign(data, { completedAt: new Date() });
    } else if (data.status !== undefined) {
      Object.assign(data, { completedAt: null });
    }

    const anime = await prisma.anime.update({
      where: { id },
      data,
    });

    return NextResponse.json(anime);
  } catch (error: unknown) {
    console.error("Anime update failed:", error);

    return NextResponse.json(
      { error: "Could not update anime. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
        { error: "Anime not found." },
        { status: 404 }
      );
    }

    await prisma.anime.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("Anime deletion failed:", error);

    return NextResponse.json(
      { error: "Could not delete anime. Please try again." },
      { status: 500 }
    );
  }
}
