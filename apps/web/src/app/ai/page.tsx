
"use client";

import { FormEvent, useState } from "react";
import "./ai.css";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const modes = [
  { value: "lore", label: "Anime Lore" },
  { value: "character", label: "Character Analysis" },
  { value: "power", label: "Power Scaling" },
  { value: "ending", label: "Ending Explained" },
  { value: "recommend", label: "Recommendations" },
];

export default function AIPage() {
  const [question, setQuestion] = useState("");
  const [anime, setAnime] = useState("");
  const [mode, setMode] = useState("lore");
  const [spoilerMode, setSpoilerMode] = useState("avoid");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || loading) return;

    if (trimmedQuestion.length > 3000) {
      setError("Your question must be 3,000 characters or fewer.");
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: trimmedQuestion,
    };

    setMessages((previous) => [...previous, userMessage]);
    setQuestion("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          anime: anime.trim(),
          mode,
          spoilerMode,
        }),
      });

      const data: { answer?: string; error?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(data.error || "The AI request failed.");
      }

      if (!data.answer) {
        throw new Error("The AI returned an empty response.");
      }

      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: data.answer! },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ai-page">
      <div className="ai-container">
        <header className="ai-header">
          <span className="ai-eyebrow">Your anime companion</span>
          <h1 className="ai-title">ANIVERSE AI ✦</h1>
          <p className="ai-description">
            Explore anime lore, understand characters, compare powers,
            and discover your next favourite series.
          </p>
        </header>

        <section className="ai-panel" aria-label="Anime AI chat">
          <div className="ai-controls">
            <div className="ai-field">
              <label htmlFor="anime-context">Anime title (optional)</label>
              <input
                id="anime-context"
                className="ai-input"
                value={anime}
                onChange={(event) => setAnime(event.target.value)}
                placeholder="e.g. Naruto, One Piece"
                maxLength={180}
              />
            </div>

            <div className="ai-field">
              <label htmlFor="ai-mode">Conversation mode</label>
              <select
                id="ai-mode"
                className="ai-select"
                value={mode}
                onChange={(event) => setMode(event.target.value)}
              >
                {modes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="ai-field">
              <label htmlFor="spoiler-mode">Spoiler protection</label>
              <select
                id="spoiler-mode"
                className="ai-select"
                value={spoilerMode}
                onChange={(event) => setSpoilerMode(event.target.value)}
              >
                <option value="avoid">Avoid major spoilers</option>
                <option value="allow">Spoilers allowed</option>
              </select>
            </div>
          </div>

          <div className="ai-messages" aria-live="polite">
            {messages.length === 0 ? (
              <div className="ai-empty">
                <div className="ai-empty-icon" aria-hidden="true">
                  ✧
                </div>
                <strong>Your anime journey starts here.</strong>
                <p>Ask a question to begin chatting with ANIVERSE AI.</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <article
                  className={`ai-message ${
                    message.role === "user"
                      ? "ai-message-user"
                      : "ai-message-assistant"
                  }`}
                  key={`${message.role}-${index}`}
                >
                  <span className="ai-message-label">
                    {message.role === "user" ? "You" : "ANIVERSE AI"}
                  </span>
                  {message.content}
                </article>
              ))
            )}

            {loading && (
              <div className="ai-message ai-message-assistant">
                <span className="ai-message-label">ANIVERSE AI</span>
                Thinking about your question...
              </div>
            )}
          </div>

          {error && (
            <div className="ai-error" role="alert">
              {error}
            </div>
          )}

          <form className="ai-composer" onSubmit={handleSubmit}>
            <textarea
              className="ai-textarea"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about anime lore, characters, or recommendations..."
              aria-label="Your anime question"
              maxLength={3000}
              required
            />
            <button
              className="ai-send"
              type="submit"
              disabled={loading || !question.trim()}
            >
              {loading ? "Thinking..." : "Ask AI ✦"}
            </button>
          </form>

          <div className="ai-status">
            {loading
              ? "Generating your answer..."
              : "Answers are AI-generated and may contain inaccuracies."}
          </div>
        </section>
      </div>
    </main>
  );
}
