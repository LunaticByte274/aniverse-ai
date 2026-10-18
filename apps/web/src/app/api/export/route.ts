
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Exports the complete ANIVERSE AI library, including episode history.
 *
 * Before deploying publicly, add authentication and authorization
 * so only authorized users can download the backup.
 */
export async function GET() {
  try {
    const [anime, episodeCount] = await Promise.all([
      prisma.anime.findMany({
        orderBy: [
          { queuePosition: "asc" },
          { createdAt: "asc" },
        ],
        include: {
          episodeLogs: {
            orderBy: [
              { watchedAt: "asc" },
              { createdAt: "asc" },
            ],
          },
        },
      }),
      prisma.episodeLog.count(),
    ]);

    const backup = {
      format: "aniverse-ai-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      counts: {
        anime: anime.length,
        episodeLogs: episodeCount,
      },
      anime,
    };

    const date = new Date().toISOString().slice(0, 10);
    const filename = `aniverse-ai-backup-${date}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    console.error("ANIVERSE AI backup export failed:", error);

    return NextResponse.json(
      { error: "Could not export the anime library." },
      { status: 500 },
    );
  }
}
