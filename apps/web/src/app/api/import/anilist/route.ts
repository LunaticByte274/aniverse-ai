
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  query: z.string().trim().min(1).max(100),
});

const query = `
  query ($search: String) {
    Page(page: 1, perPage: 12) {
      media(
        search: $search
        type: ANIME
        sort: SEARCH_MATCH
        isAdult: false
      ) {
        id
        idMal
        title {
          romaji
          english
          native
        }
        description(asHtml: false)
        coverImage {
          large
        }
        episodes
        genres
        seasonYear
        format
        status
      }
    }
  }
`;

interface AniListMedia {
  id: number;
  idMal?: number | null;
  title?: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  } | null;
  description?: string | null;
  coverImage?: {
    large?: string | null;
  } | null;
  episodes?: number | null;
  genres?: string[];
  seasonYear?: number | null;
  format?: string | null;
  status?: string | null;
}

interface AniListResponse {
  data?: {
    Page?: {
      media?: AniListMedia[];
    };
  };
  errors?: Array<{ message?: string }>;
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

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Enter a search term between 1 and 100 characters.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          search: parsed.data.query,
        },
      }),
      signal: AbortSignal.timeout(9000),
    });

    if (!response.ok) {
      console.error("AniList search failed:", response.status);

      return NextResponse.json(
        { error: "AniList search is temporarily unavailable." },
        { status: 502 }
      );
    }

    const json = (await response.json()) as AniListResponse;

    if (json.errors?.length) {
      console.error("AniList GraphQL errors:", json.errors);

      return NextResponse.json(
        { error: "AniList could not complete the search." },
        { status: 502 }
      );
    }

    const media = (json.data?.Page?.media ?? []).map((item) => ({
      source: "ANILIST",
      sourceId: String(item.id),
      malId: item.idMal ?? null,
      title:
        item.title?.romaji ||
        item.title?.english ||
        "Untitled anime",
      englishTitle: item.title?.english ?? null,
      nativeTitle: item.title?.native ?? null,
      synopsis: item.description ?? null,
      coverImage: item.coverImage?.large ?? null,
      totalEpisodes: item.episodes ?? null,
      genres: item.genres ?? [],
    }));

    return NextResponse.json(media, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error(
      "AniList search request failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");

    return NextResponse.json(
      {
        error: timedOut
          ? "AniList search timed out. Please try again."
          : "Could not reach AniList. Check your connection and try again.",
      },
      { status: 502 }
    );
  }
}
