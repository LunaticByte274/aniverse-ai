
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const seasons = ["WINTER", "SPRING", "SUMMER", "FALL"] as const;

type AnimeSeason = (typeof seasons)[number];

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
    extraLarge?: string | null;
    large?: string | null;
  } | null;
  bannerImage?: string | null;
  episodes?: number | null;
  genres?: string[];
  averageScore?: number | null;
  popularity?: number | null;
  seasonYear?: number | null;
  format?: string | null;
  status?: string | null;
}

interface AniListResponse {
  data?: {
    trending?: {
      media?: AniListMedia[];
    };
    seasonal?: {
      media?: AniListMedia[];
    };
  };
  errors?: Array<{ message?: string }>;
}

const query = `
  query ($sort: [MediaSort], $season: MediaSeason, $year: Int) {
    trending: Page(page: 1, perPage: 12) {
      media(
        type: ANIME
        sort: $sort
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
          extraLarge
          large
        }
        bannerImage
        episodes
        genres
        averageScore
        popularity
        seasonYear
        format
        status
      }
    }

    seasonal: Page(page: 1, perPage: 12) {
      media(
        type: ANIME
        season: $season
        seasonYear: $year
        sort: POPULARITY_DESC
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
          extraLarge
          large
        }
        bannerImage
        episodes
        genres
        averageScore
        popularity
        seasonYear
        format
        status
      }
    }
  }
`;

function getCurrentSeason(date: Date): AnimeSeason {
  const month = date.getUTCMonth();

  if (month < 3) return "WINTER";
  if (month < 6) return "SPRING";
  if (month < 9) return "SUMMER";

  return "FALL";
}

function mapAnime(items: AniListMedia[]) {
  return items.map((item) => ({
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
    coverImage:
      item.coverImage?.extraLarge ||
      item.coverImage?.large ||
      null,
    bannerImage: item.bannerImage ?? null,
    totalEpisodes: item.episodes ?? null,
    genres: item.genres ?? [],
    averageScore: item.averageScore ?? null,
    popularity: item.popularity ?? null,
    seasonYear: item.seasonYear ?? null,
    format: item.format ?? null,
    mediaStatus: item.status ?? null,
  }));
}

export async function GET() {
  try {
    const now = new Date();
    const season = getCurrentSeason(now);
    const year = now.getUTCFullYear();

    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          sort: ["TRENDING_DESC"],
          season,
          year,
        },
      }),
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      console.error(
        "AniList request failed with status:",
        response.status
      );

      return NextResponse.json(
        {
          error:
            "AniList discovery is temporarily unavailable. Please try again.",
        },
        { status: 502 }
      );
    }

    const json = (await response.json()) as AniListResponse;

    if (json.errors?.length) {
      console.error("AniList GraphQL errors:", json.errors);

      return NextResponse.json(
        { error: "AniList could not retrieve anime discovery data." },
        { status: 502 }
      );
    }

    const trending = mapAnime(json.data?.trending?.media ?? []);
    const seasonal = mapAnime(json.data?.seasonal?.media ?? []);

    const seasonalIds = new Set(
      seasonal.map((anime) => anime.sourceId)
    );

    const upcoming = trending
      .filter(
        (anime) =>
          anime.mediaStatus === "NOT_YET_RELEASED" &&
          !seasonalIds.has(anime.sourceId)
      )
      .slice(0, 8);

    return NextResponse.json(
      {
        trending,
        seasonal,
        upcoming,
        season,
        year,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      }
    );
  } catch (error: unknown) {
    console.error(
      "Anime discovery failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");

    return NextResponse.json(
      {
        error: timedOut
          ? "AniList took too long to respond. Please try again."
          : "Could not reach AniList. Check your internet connection and try again.",
      },
      { status: 502 }
    );
  }
}
