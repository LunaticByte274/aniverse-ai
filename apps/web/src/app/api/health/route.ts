
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        ok: true,
        database: "connected",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        ok: false,
        database: "unavailable",
      },
      { status: 503 }
    );
  }
}
