
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VALID_MODES = [
  "lore",
  "character",
  "power",
  "ending",
  "recommend",
] as const;

type AIMode = (typeof VALID_MODES)[number];
type SpoilerMode = "allow" | "avoid";

interface AIRequestBody {
  question?: unknown;
  anime?: unknown;
  spoilerMode?: unknown;
  mode?: unknown;
}

interface OllamaResponse {
  message?: {
    content?: unknown;
  };
  error?: unknown;
}

function isAIMode(value: unknown): value is AIMode {
  return (
    typeof value === "string" &&
    VALID_MODES.some((mode) => mode === value)
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.OLLAMA_API_KEY;
  const model = process.env.OLLAMA_MODEL || "gpt-oss:20b";

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI is not configured. Add OLLAMA_API_KEY to apps/web/.env and restart the development server.",
      },
      { status: 503 }
    );
  }

  let body: AIRequestBody;

  try {
    body = (await request.json()) as AIRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const question =
    typeof body.question === "string" ? body.question.trim() : "";

  const anime =
    typeof body.anime === "string" ? body.anime.trim() : "";

  const spoilerMode: SpoilerMode =
    body.spoilerMode === "allow" ? "allow" : "avoid";

  const mode: AIMode = isAIMode(body.mode) ? body.mode : "lore";

  if (!question || question.length > 3000) {
    return NextResponse.json(
      { error: "Enter a question (maximum 3,000 characters)." },
      { status: 400 }
    );
  }

  const system = `
You are ANIVERSE AI, a thoughtful anime companion.

Be specific, useful, and engaging. Use clear headings or bullets when
they improve readability.

Do not invent official facts, episode numbers, quotes, citations, or
streaming availability. This app does not retrieve verified sources,
so never claim that you checked sources.

The requested mode is: ${mode}.

${
  spoilerMode === "avoid"
    ? `STRICT SPOILER PROTECTION:
Do not reveal major twists, deaths, identities, endings, or events
beyond the user's stated progress. If progress is unknown, keep the
response spoiler-light.`
    : `SPOILERS ARE ALLOWED:
Clearly label major spoilers before revealing them.`
}

For recommendations:
- Explain why each title matches the user's stated taste.
- Give spoiler-light descriptions.
- Distinguish recommendations by mood or style.
- Avoid recommending titles the user says they have already watched.
- Do not fabricate personal watch history.
`.trim();

  const user = `
${anime ? `Anime context: ${anime}\n` : ""}
Spoiler setting: ${
    spoilerMode === "avoid" ? "Avoid major spoilers" : "Spoilers allowed"
  }

Question: ${question}
`.trim();

  try {
    const response = await fetch("https://ollama.com/api/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        options: {
          temperature: 0.5,
        },
      }),
      signal: AbortSignal.timeout(60000),
    });

    const data: OllamaResponse | null = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      const message =
        typeof data?.error === "string"
          ? data.error
          : "The Ollama Cloud request failed.";

      return NextResponse.json(
        { error: message },
        { status: response.status === 429 ? 429 : 502 }
      );
    }

    const answer = data?.message?.content;

    if (typeof answer !== "string" || !answer.trim()) {
      return NextResponse.json(
        {
          error: "The AI returned an empty answer. Please try again.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      answer: answer.trim(),
      model,
      groundedSources: false,
    });
  } catch (error: unknown) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");

    console.error(
      "ANIVERSE AI request failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      {
        error: isTimeout
          ? "The AI request timed out. Try again in a moment."
          : "Could not process the AI request. Check the development server log and try again.",
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
