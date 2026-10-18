"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, BookmarkPlus, Check, Flame, LoaderCircle, Search, Sparkles,
  Star, Tv, ExternalLink, BrainCircuit, ShieldCheck, WandSparkles
} from "lucide-react";
import "./explore.css";
import "./recommendations.css";

type Title = {
  source: string;
  sourceId: string;
  malId?: number | null;
  title: string;
  englishTitle?: string | null;
  synopsis?: string | null;
  coverImage?: string | null;
  bannerImage?: string | null;
  totalEpisodes?: number | null;
  genres: string[];
  averageScore?: number | null;
  popularity?: number | null;
  seasonYear?: number | null;
  format?: string | null;
  mediaStatus?: string | null;
};
type Payload = { trending: Title[]; seasonal: Title[]; upcoming: Title[]; season: string; year: number };

const seasonNames: Record<string, string> = {
  WINTER: "Winter", SPRING: "Spring", SUMMER: "Summer", FALL: "Fall"
};
const tastes = [
  { id: "mind", label: "Mind-bending twists", detail: "Unpredictable plots, hidden clues, psychological mysteries" },
  { id: "supernatural", label: "Supernatural mysteries", detail: "Spirits, curses, strange phenomena, eerie secrets" },
  { id: "detective", label: "Detective-style puzzles", detail: "Evidence, investigations, suspects, clever deductions" },
  { id: "dark", label: "Dark and atmospheric", detail: "Tense mood, horror elements, unsettling worlds" },
  { id: "emotional", label: "Emotional stories", detail: "Strong characters, meaningful stakes, supernatural themes" },
  { id: "adventure", label: "Fantasy and adventure", detail: "Immersive worlds, discoveries, and high-stakes journeys" },
];

export default function ExplorePage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All genres");
  const [added, setAdded] = useState<string[]>([]);
  const [adding, setAdding] = useState("");
  const [notice, setNotice] = useState("");
  const [taste, setTaste] = useState("supernatural");
  const [watched, setWatched] = useState("none");
  const [watchedTitles, setWatchedTitles] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendError, setRecommendError] = useState("");

  async function loadDiscovery() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/discover", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Discovery failed");
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discovery failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadDiscovery(); }, []);

  const genres = useMemo(
    () => ["All genres", ...Array.from(new Set((data?.trending ?? []).flatMap(x => x.genres))).sort()],
    [data]
  );
  const filter = (items: Title[]) =>
    items.filter(x =>
      (genre === "All genres" || x.genres.includes(genre)) &&
      (!query.trim() || `${x.title} ${x.englishTitle ?? ""} ${x.genres.join(" ")}`.toLowerCase().includes(query.toLowerCase()))
    );

  async function add(title: Title) {
    setAdding(title.sourceId);
    setNotice("");
    try {
      const res = await fetch("/api/anime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.title, englishTitle: title.englishTitle, synopsis: title.synopsis,
          coverImage: title.coverImage, totalEpisodes: title.totalEpisodes, genres: title.genres,
          source: title.source, sourceId: title.sourceId, malId: title.malId
        })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not add anime");
      setAdded(old => old.includes(title.sourceId) ? old : [...old, title.sourceId]);
      setNotice(`${title.englishTitle || title.title} is in your library.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not add anime");
    } finally {
      setAdding("");
    }
  }

  async function personalize() {
    setRecommendLoading(true);
    setRecommendError("");
    setRecommendations("");
    const tasteLabel = tastes.find(x => x.id === taste)?.label || taste;
    const question = [
      "Recommend exactly three anime for me.",
      `My preferred style: ${tasteLabel}.`,
      `Preference details: ${tastes.find(x => x.id === taste)?.detail || ""}.`,
      `Already watched: ${watched === "all" ? "I have watched many popular anime; ask me for titles if needed" : watched === "some" ? (watchedTitles.trim() || "I have watched some anime but have not listed them") : "I am relatively new to these recommendations"}.`,
      "Avoid any titles listed here: " + (watchedTitles.trim() || "No specific titles provided") + ".",
      "For each recommendation, include title, a short spoiler-free premise, why it matches my taste, and a distinct 'best for' label. Avoid major spoilers. Do not claim to know my AniList watch history because it has not been provided to you. Format clearly with numbered recommendations."
    ].join("\n");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, mode: "recommend", spoilerMode: "avoid" })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Could not generate recommendations");
      setRecommendations(body.answer);
    } catch (e) {
      setRecommendError(e instanceof Error ? e.message : "Could not generate recommendations");
    } finally {
      setRecommendLoading(false);
    }
  }

  function section(title: string, subtitle: string, items: Title[], icon: React.ReactNode) {
    const visible = filter(items);
    return (
      <section className="discover-section" key={title}>
        <div className="discover-section-heading">
          <div className="discover-section-icon">{icon}</div>
          <div><h2>{title}</h2><p>{subtitle}</p></div>
          <span className="discover-count">{visible.length}</span>
        </div>
        {visible.length ? (
          <div className="discover-grid">
            {visible.map(item => (
              <article className="discover-card" key={item.sourceId}>
                <div className="discover-poster">
                  {item.coverImage ? <img src={item.coverImage} alt={`${item.title} poster`} loading="lazy" /> : <div className="discover-no-poster"><Sparkles /></div>}
                  <span className="discover-format">{(item.format || "ANIME").replaceAll("_", " ")}</span>
                  {item.averageScore ? <span className="discover-score"><Star size={12} fill="currentColor" /> {item.averageScore}%</span> : null}
                  <button className={`discover-add ${added.includes(item.sourceId) ? "is-added" : ""}`} onClick={() => void add(item)} disabled={adding === item.sourceId || added.includes(item.sourceId)} aria-label={`Add ${item.title} to library`}>
                    {adding === item.sourceId ? <LoaderCircle className="discover-spin" size={17} /> : added.includes(item.sourceId) ? <Check size={17} /> : <BookmarkPlus size={17} />}
                  </button>
                </div>
                <div className="discover-card-body">
                  <h3 title={item.englishTitle || item.title}>{item.englishTitle || item.title}</h3>
                  <p className="discover-romaji">{item.title}</p>
                  <div className="discover-meta">{item.totalEpisodes ? `${item.totalEpisodes} eps` : "Episode count TBA"}{item.seasonYear ? ` · ${item.seasonYear}` : ""}{item.popularity ? ` · ${item.popularity.toLocaleString()} fans` : ""}</div>
                  <div className="discover-genres">{item.genres.slice(0, 3).map(g => <span key={g}>{g}</span>)}</div>
                  <p className="discover-synopsis">{(item.synopsis || "No synopsis available.").replace(/<[^>]*>/g, " ").slice(0, 150)}{(item.synopsis || "").length > 150 ? "…" : ""}</p>
                  <a className="discover-add-label" href={`https://reanime.to/search?query=${encodeURIComponent(`${item.englishTitle || item.title} episode 1`)}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Watch on Re:Anime</a>
                  <button className="discover-add-label" disabled={adding === item.sourceId || added.includes(item.sourceId)} onClick={() => void add(item)}>
                    {added.includes(item.sourceId) ? <><Check size={14} /> Added to library</> : adding === item.sourceId ? <><LoaderCircle className="discover-spin" size={14} /> Adding…</> : <><BookmarkPlus size={14} /> Add to library</>}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="discover-empty">No titles match these filters. Try another genre or search term.</div>}
      </section>
    );
  }

  return (
    <main className="explore-page">
      <header className="explore-topbar">
        <Link href="/" className="explore-back"><ArrowLeft size={16} /> Back to library</Link>
        <div className="explore-brand"><span><Sparkles size={17} /></span> ANIVERSE <b>DISCOVER</b></div>
        <div className="explore-source"><span /> Live AniList data</div>
      </header>
      <div className="explore-content">
        <div className="explore-intro">
          <div className="explore-eyebrow"><Sparkles size={14} /> YOUR NEXT OBSESSION STARTS HERE</div>
          <h1>Find your <span>next universe.</span></h1>
          <p>Explore trending anime, discover the current season, and get AI recommendations tailored to your taste.</p>
          <div className="explore-controls">
            <label className="explore-search"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search titles, genres…" /><kbd>⌘ K</kbd></label>
            <select value={genre} onChange={e => setGenre(e.target.value)} aria-label="Filter by genre">{genres.map(g => <option key={g}>{g}</option>)}</select>
          </div>
        </div>

        <section className="recommend-panel">
          <div className="recommend-heading">
            <div className="recommend-icon"><BrainCircuit size={22} /></div>
            <div><div className="recommend-eyebrow"><WandSparkles size={13} /> PERSONALIZED BY ANIVERSE AI</div><h2>Find your kind of anime.</h2><p>Choose what you enjoy. Get three spoiler-light recommendations and why each one fits.</p></div>
          </div>
          <div className="recommend-tastes" role="group" aria-label="Choose your anime taste">
            {tastes.map(t => <button type="button" key={t.id} className={`recommend-taste ${taste === t.id ? "selected" : ""}`} onClick={() => setTaste(t.id)} aria-pressed={taste === t.id}><strong>{t.label}</strong><span>{t.detail}</span></button>)}
          </div>
          <div className="recommend-bottom">
            <label className="recommend-watched">Have you watched some anime already?
              <select value={watched} onChange={e => setWatched(e.target.value)}>
                <option value="none">I'm open to popular starting picks</option>
                <option value="some">I've watched some anime</option>
                <option value="all">I've watched lots of anime</option>
              </select>
            </label>
            <label className="recommend-watched recommend-exclusions">Titles you've already watched (optional)
              <input value={watchedTitles} onChange={e => setWatchedTitles(e.target.value)} placeholder="e.g. Erased, Death Note, Mononoke" />
            </label>
          </div>
          <button className="recommend-submit" onClick={() => void personalize()} disabled={recommendLoading}>
            {recommendLoading ? <><LoaderCircle className="discover-spin" size={17} /> Finding your next obsession…</> : <><Sparkles size={17} /> Personalize my recommendations</>}
          </button>
          <div className="recommend-spoiler-note"><ShieldCheck size={15} /> Spoiler-safe by default. Recommendations are AI-generated and may need fact-checking.</div>
          {recommendError && <div className="recommend-error" role="alert">{recommendError}</div>}
          {recommendations && <div className="recommend-results"><div className="recommend-results-title"><Sparkles size={17} /><h3>Your personalized watchlist</h3></div><div className="recommend-answer">{recommendations}</div><button className="recommend-reset" onClick={() => { setRecommendations(""); setRecommendError(""); }}>Try different preferences</button></div>}
        </section>

        {notice && <div className="explore-notice">{notice}</div>}
        {loading && <div className="explore-loading"><LoaderCircle className="discover-spin" size={24} /> Loading live anime discovery…</div>}
        {error && <div className="explore-error"><strong>Could not load anime right now.</strong><p>{error}</p><button onClick={() => void loadDiscovery()}>Try again</button></div>}
        {data && !loading && <>
          {section("Trending now", "Popular anime fans are watching and talking about.", data.trending, <Flame size={19} />)}
          {section(`${seasonNames[data.season] || data.season} ${data.year}`, "Anime for the current season, sourced from AniList.", data.seasonal, <Tv size={19} />)}
          {data.upcoming.length > 0 && section("Coming soon", "Popular titles marked as not yet released.", data.upcoming, <Sparkles size={19} />)}
        </>}
        <footer className="explore-footer">Metadata and rankings provided by AniList. Availability and episode counts can change.</footer>
      </div>
    </main>
  );
}
