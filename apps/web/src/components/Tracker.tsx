
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Activity,
  ArrowDownUp,
  Check,
  ChevronDown,
  CircleHelp,
  Clapperboard,
  Clock3,
  Compass,
  ExternalLink,
  Flame,
  History,
  ListVideo,
  LoaderCircle,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Star,
  Trash2,
  Tv,
  WandSparkles,
  X,
  BrainCircuit,
} from "lucide-react";

type Anime = {
  id: string;
  title: string;
  englishTitle?: string | null;
  synopsis?: string | null;
  coverImage?: string | null;
  totalEpisodes?: number | null;
  currentSeason: number;
  currentEpisode: number;
  status: string;
  priority: string;
  queuePosition: number;
  userRating?: number | null;
  personalNotes?: string | null;
  rewatchCount: number;
  genres: string;
  source: string;
  episodeLogs?: EpisodeLog[];
};

type EpisodeLog = {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  watchedAt: string;
  rating?: number | null;
  notes?: string | null;
  rewatch: boolean;
};

type SearchResult = {
  title: string;
  englishTitle?: string | null;
  synopsis?: string | null;
  coverImage?: string | null;
  totalEpisodes?: number | null;
  genres: string[];
  source: string;
  sourceId: string;
  malId?: number | null;
};

const statuses = [
  { value: "WATCHING", label: "Watching" },
  { value: "PLANNING", label: "Plan to watch" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "DROPPED", label: "Dropped" },
  { value: "REWATCHING", label: "Rewatching" },
];

export default function Tracker() {
  const [anime, setAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("All anime");
  const [sort, setSort] = useState("custom");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [detail, setDetail] = useState<Anime | null>(null);
  const [episodeNote, setEpisodeNote] = useState("");
  const [episodeRating, setEpisodeRating] = useState("8");
  const [history, setHistory] = useState<EpisodeLog[]>([]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/anime?sort=${sort}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Could not load your library.");
      }

      const data: Anime[] = await response.json();
      setAnime(data);
    } catch {
      setNotice(
        "Could not load your library. Check that the database is initialized."
      );
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    return anime.filter((item) => {
      const matchesTab =
        tab === "All anime" ||
        (tab === "Queue" && item.status === "PLANNING") ||
        (tab === "History" && (item.episodeLogs?.length ?? 0) > 0) ||
        item.status === tab.toUpperCase().replaceAll(" ", "_");

      const term = search.toLowerCase();

      const matchesSearch =
        !term ||
        item.title.toLowerCase().includes(term) ||
        (item.englishTitle ?? "").toLowerCase().includes(term);

      return matchesTab && matchesSearch;
    });
  }, [anime, tab, search]);

  const watching = anime.filter(
    (item) =>
      item.status === "WATCHING" || item.status === "REWATCHING"
  );

  const watchedCount = anime.reduce(
    (sum, item) =>
      sum +
      (item.episodeLogs ?? []).filter((log) => !log.rewatch).length,
    0
  );

  const completed = anime.filter(
    (item) => item.status === "COMPLETED"
  ).length;

  async function addAnime(item: SearchResult | { title: string }) {
    const payload =
      "source" in item
        ? item
        : { title: item.title, source: "MANUAL" };

    try {
      const response = await fetch("/api/anime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setNotice(data?.error ?? "Could not add this anime.");
        return;
      }

      setNotice(`Added ${item.title} to your library.`);
      setResults([]);
      setSearch("");
      setManualTitle("");
      setShowAdd(false);
      await refresh();
    } catch {
      setNotice("Could not connect to the server. Please try again.");
    }
  }

  async function searchAniList() {
    if (!search.trim()) return;

    setSearching(true);
    setNotice("");

    try {
      const response = await fetch("/api/import/anilist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: search.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Anime search failed.");
      }

      setResults(data);

      if (data.length === 0) {
        setNotice(
          "No results found. Try another title or add it manually."
        );
      }
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Search failed."
      );
    } finally {
      setSearching(false);
    }
  }

  async function updateAnime(
    id: string,
    payload: Record<string, unknown>
  ) {
    try {
      const response = await fetch(`/api/anime/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setNotice("Update failed. Please try again.");
        return;
      }

      await refresh();
    } catch {
      setNotice("Could not update anime. Check your connection.");
    }
  }

  async function markWatched(
    item: Anime,
    rewatch = item.status === "REWATCHING"
  ) {
    const nextEpisode = Math.max(1, item.currentEpisode);

    try {
      const response = await fetch(
        `/api/anime/${item.id}/episode`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seasonNumber: item.currentSeason || 1,
            episodeNumber: nextEpisode,
            rating: Number(episodeRating) || null,
            notes: episodeNote || null,
            rewatch,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setNotice(data?.error ?? "Could not save this episode.");
        return;
      }

      setEpisodeNote("");
      setNotice(
        `Recorded ${item.title} · S${item.currentSeason} E${nextEpisode}.`
      );

      await refresh();

      if (detail?.id === item.id) {
        setDetail({
          ...detail,
          currentEpisode: nextEpisode + 1,
          status: rewatch ? "REWATCHING" : "WATCHING",
        });

        const historyResponse = await fetch(
          `/api/anime/${item.id}/episode`
        );

        if (historyResponse.ok) {
          setHistory(await historyResponse.json());
        }
      }
    } catch {
      setNotice("Could not save the episode. Please try again.");
    }
  }

  async function openDetail(item: Anime) {
    setDetail(item);
    setEpisodeNote("");

    try {
      const response = await fetch(
        `/api/anime/${item.id}/episode`
      );

      if (response.ok) {
        setHistory(await response.json());
      } else {
        setHistory([]);
        setNotice("Could not load episode history.");
      }
    } catch {
      setHistory([]);
      setNotice("Could not load episode history.");
    }
  }

  async function removeAnime(item: Anime) {
    if (
      !window.confirm(
        `Remove ${item.title} and its episode history?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/anime/${item.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setNotice("Could not remove this anime.");
        return;
      }

      setDetail(null);
      setNotice(`${item.title} was removed from your library.`);
      await refresh();
    } catch {
      setNotice("Could not remove anime. Please try again.");
    }
  }

  async function moveInQueue(
    item: Anime,
    direction: -1 | 1
  ) {
    const queue = anime
      .filter((entry) => entry.status === "PLANNING")
      .sort((a, b) => a.queuePosition - b.queuePosition);

    const index = queue.findIndex((entry) => entry.id === item.id);
    const target = queue[index + direction];

    if (!target) return;

    try {
      const responses = await Promise.all([
        fetch(`/api/anime/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            queuePosition: target.queuePosition,
          }),
        }),
        fetch(`/api/anime/${target.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            queuePosition: item.queuePosition,
          }),
        }),
      ]);

      if (responses.some((response) => !response.ok)) {
        setNotice("Could not reorder your queue.");
      }

      await refresh();
    } catch {
      setNotice("Could not reorder your queue.");
    }
  }

  const activeLabel = (status: string) =>
    statuses.find((item) => item.value === status)?.label ?? status;

  const progress = (item: Anime) =>
    item.totalEpisodes
      ? Math.min(
          100,
          Math.round(
            (Math.max(0, item.currentEpisode - 1) /
              item.totalEpisodes) *
              100
          )
        )
      : 0;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top">
          <span className="brand-mark">
            <Sparkles size={21} />
          </span>
          <span>
            ANI<span className="brand-accent">VERSE</span>
            <small>YOUR ANIME UNIVERSE</small>
          </span>
        </a>

        <div className="side-label">WORKSPACE</div>

        {[
          { label: "All anime", icon: Clapperboard },
          { label: "Watching", icon: Tv },
          { label: "Queue", icon: ListVideo },
          { label: "Completed", icon: Check },
          { label: "History", icon: History },
        ].map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => setTab(label)}
            className={`nav-item ${tab === label ? "active" : ""}`}
          >
            <Icon size={17} />
            <span>{label}</span>
            {label === "Queue" && (
              <span className="nav-count">
                {anime.filter((item) => item.status === "PLANNING").length}
              </span>
            )}
          </button>
        ))}

        <div className="side-label discovery-label">DISCOVER</div>

        <button
          className="nav-item"
          onClick={() => {
            window.location.href = "/explore";
          }}
        >
          <Compass size={17} />
          <span>Explore anime</span>
        </button>

        <button
          className="nav-item"
          onClick={() => {
            window.location.href = "/ai";
          }}
        >
          <BrainCircuit size={17} />
          <span>AI Companion</span>
        </button>

        <div className="sidebar-bottom">
          <div className="mini-orbit">
            <div className="orbit-dot" />
            <Sparkles size={22} />
          </div>
          <strong>Your next adventure awaits.</strong>
          <p>
            Keep your watchlist close and your next episode closer.
          </p>
          <button
            className="side-cta"
            onClick={() => setShowAdd(true)}
          >
            <Plus size={15} /> Add anime
          </button>
          <div className="side-foot">
            <span className="status-dot" />
            Local library
            <span className="version">BETA 0.1</span>
          </div>
        </div>
      </aside>

      <section className="main-area" id="top">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{tab}</strong>
          </div>
          <div className="top-actions">
            <div className="local-pill">
              <span className="status-dot" /> Autosaved locally
            </div>
            <button
              className="icon-button"
              title="Tracker settings"
              onClick={() =>
                setNotice(
                  "Tracker settings and account sync are planned for a future release."
                )
              }
            >
              <Settings2 size={18} />
            </button>
            <div className="avatar">A</div>
          </div>
        </header>

        <div className="content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-line" />
                YOUR PERSONAL ANIME HUB
              </div>
              <h1>
                Welcome to your <span>universe.</span>
              </h1>
              <p className="subheading">
                Your stories. Your progress. Your next obsession.
              </p>
            </div>
            <button
              className="primary-button"
              onClick={() => {
                setShowAdd(true);
                setResults([]);
                setSearch("");
              }}
            >
              <Plus size={17} /> Add anime
              <span className="button-shine" />
            </button>
          </section>

          <section className="hero-panel">
            <div className="hero-copy">
              <div className="hero-chip">
                <Sparkles size={13} /> YOUR WATCH JOURNEY
              </div>
              <h2>
                One more episode.
                <br />
                <span>A thousand new worlds.</span>
              </h2>
              <p>
                Pick up where you left off, keep your queue in order,
                and never lose track of a story again.
              </p>
              <button
                className="hero-button"
                onClick={() => setTab("Watching")}
              >
                Continue watching <span>↗</span>
              </button>
              <div className="hero-foot">
                <span>
                  <span className="tiny-dot" /> YOUR LIBRARY, ALWAYS IN SYNC
                </span>
                <span>✦ Made for anime fans</span>
              </div>
            </div>

            <div className="hero-art" aria-hidden="true">
              <div className="planet planet-back" />
              <div className="planet planet-main">
                <div className="planet-glow" />
              </div>
              <div className="ring ring-one" />
              <div className="ring ring-two" />
              <div className="star-field">
                ✦ <span>·</span> ✧ <span>·</span> ✦
                <br />
                <span>·</span> ✧ <span>·</span> ✦
              </div>
              <div className="float-tag tag-one">
                <Flame size={14} /> Your next arc
              </div>
              <div className="float-tag tag-two">
                <Activity size={14} /> Progress saved
              </div>
            </div>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon purple">
                <Clapperboard size={18} />
              </div>
              <div>
                <span className="stat-label">IN YOUR LIBRARY</span>
                <div className="stat-value">
                  {anime.length}<span> titles</span>
                </div>
              </div>
              <div className="stat-spark">✦</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon blue">
                <Tv size={18} />
              </div>
              <div>
                <span className="stat-label">CURRENTLY WATCHING</span>
                <div className="stat-value">
                  {watching.length}<span> series</span>
                </div>
              </div>
              <div className="stat-spark">↗</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon pink">
                <Clock3 size={18} />
              </div>
              <div>
                <span className="stat-label">EPISODES LOGGED</span>
                <div className="stat-value">
                  {watchedCount}<span> episodes</span>
                </div>
              </div>
              <div className="stat-spark">✧</div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">
                <Check size={18} />
              </div>
              <div>
                <span className="stat-label">COMPLETED</span>
                <div className="stat-value">
                  {completed}<span> anime</span>
                </div>
              </div>
              <div className="stat-spark">✦</div>
            </div>
          </section>

          <section className="library-section">
            <div className="section-heading">
              <div>
                <div className="section-kicker">YOUR COLLECTION</div>
                <h2>
                  {tab === "All anime"
                    ? "Your anime library"
                    : tab === "Queue"
                      ? "Up next in your queue"
                      : tab === "History"
                        ? "Your watch history"
                        : `${tab} anime`}
                  <span className="title-count">{filtered.length}</span>
                </h2>
              </div>

              <div className="library-actions">
                <label className="search-box">
                  <Search size={16} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search your library..."
                  />
                  <kbd>⌘ K</kbd>
                </label>

                <div className="sort-select">
                  <ArrowDownUp size={14} />
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    aria-label="Sort library"
                  >
                    <option value="custom">Custom order</option>
                    <option value="priority">Priority</option>
                    <option value="recent">Recently updated</option>
                  </select>
                  <ChevronDown size={13} />
                </div>
              </div>
            </div>

            <div className="filter-row">
              {[
                "All anime",
                "Watching",
                "Queue",
                "Completed",
                "On hold",
                "History",
              ].map((item) => (
                <button
                  key={item}
                  className={`filter-pill ${tab === item ? "selected" : ""}`}
                  onClick={() => setTab(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            {notice && (
              <div className="notice">
                <CircleHelp size={15} />
                <span>{notice}</span>
                <button
                  onClick={() => setNotice("")}
                  aria-label="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {loading ? (
              <div className="empty-state">
                <LoaderCircle className="spin" size={25} />
                <p>Opening your universe…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <WandSparkles size={26} />
                </div>
                <h3>Your next favorite starts here.</h3>
                <p>
                  {tab === "All anime"
                    ? "Add your first anime to start building your personal universe."
                    : `No anime in “${tab}” yet. Add a title or change your filter.`}
                </p>
                <button
                  className="primary-button"
                  onClick={() => setShowAdd(true)}
                >
                  <Plus size={16} /> Discover anime
                </button>
              </div>
            ) : (
              <div className="anime-grid">
                {filtered.map((item, index) => (
                  <article className="anime-card" key={item.id}>
                    <button
                      className="cover-button"
                      onClick={() => void openDetail(item)}
                      aria-label={`Open ${item.title} details`}
                    >
                      {item.coverImage ? (
                        <img
                          className="cover"
                          src={item.coverImage}
                          alt={`${item.title} cover`}
                        />
                      ) : (
                        <div className={`cover-placeholder tone-${index % 5}`}>
                          <Sparkles size={27} />
                          <span>{item.title}</span>
                        </div>
                      )}
                      <span
                        className={`status-badge ${item.status.toLowerCase()}`}
                      >
                        {activeLabel(item.status)}
                      </span>
                      <span className="cover-overlay">
                        <span>View details ↗</span>
                      </span>
                    </button>

                    <div className="anime-info">
                      <button
                        className="anime-title"
                        onClick={() => void openDetail(item)}
                      >
                        {item.englishTitle || item.title}
                      </button>

                      <div className="anime-subtitle">
                        {item.totalEpisodes
                          ? `${item.totalEpisodes} episodes`
                          : "Episode count unknown"}
                        {item.genres
                          ? ` · ${item.genres.split(",").slice(0, 2).join(" · ")}`
                          : ""}
                      </div>

                      <div className="progress-label">
                        <span>
                          {item.status === "PLANNING"
                            ? "Ready when you are"
                            : item.status === "COMPLETED"
                              ? "Story complete"
                              : `S${item.currentSeason} · Ep ${Math.max(1, item.currentEpisode)}`}
                        </span>
                        <span>
                          {item.totalEpisodes && item.status !== "PLANNING"
                            ? `${progress(item)}%`
                            : item.userRating
                              ? `★ ${item.userRating}/10`
                              : ""}
                        </span>
                      </div>

                      <div className="progress-track">
                        <span
                          style={{
                            width: `${
                              item.status === "COMPLETED"
                                ? 100
                                : progress(item)
                            }%`,
                          }}
                        />
                      </div>

                      <div className="card-actions">
                        <button
                          className="watched-button"
                          onClick={() =>
                            window.open(
                              `https://reanime.to/search?query=${encodeURIComponent(
                                `${item.englishTitle || item.title} episode ${Math.max(1, item.currentEpisode)}`
                              )}`,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                        >
                          <ExternalLink size={14} /> Watch now
                        </button>

                        {item.status !== "COMPLETED" ? (
                          <button
                            className="watched-button"
                            onClick={() => void markWatched(item)}
                          >
                            <Check size={14} />
                            {item.currentEpisode > 0
                              ? "Mark watched"
                              : "Start tracking"}
                          </button>
                        ) : (
                          <button
                            className="watched-button muted"
                            onClick={() =>
                              void updateAnime(item.id, {
                                status: "REWATCHING",
                                currentEpisode: 1,
                                rewatchCount: item.rewatchCount + 1,
                              })
                            }
                          >
                            <History size={14} /> Rewatch
                          </button>
                        )}

                        <button
                          className="more-button"
                          title="Anime details"
                          onClick={() => void openDetail(item)}
                        >
                          •••
                        </button>
                      </div>

                      {tab === "Queue" && (
                        <div className="queue-controls">
                          <button
                            onClick={() => void moveInQueue(item, -1)}
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => void moveInQueue(item, 1)}
                            title="Move down"
                          >
                            ↓
                          </button>
                          <select
                            value={item.priority}
                            onChange={(event) =>
                              void updateAnime(item.id, {
                                priority: event.target.value,
                              })
                            }
                            aria-label="Queue priority"
                          >
                            <option value="LOW">Low</option>
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">High</option>
                            <option value="MUST_WATCH">Must watch</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <footer className="footer">
            <span>
              ✦ ANIVERSE AI{" "}
              <span className="footer-muted">· Your stories live here.</span>
            </span>
            <span>
              Built for the love of anime{" "}
              <span className="footer-heart">♥</span>
            </span>
          </footer>
        </div>
      </section>

      {showAdd && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowAdd(false);
            }
          }}
        >
          <section className="modal add-modal">
            <div className="modal-heading">
              <div>
                <div className="section-kicker">GROW YOUR UNIVERSE</div>
                <h2>Find your next anime</h2>
                <p>Search AniList, then add a title to your library.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowAdd(false)}
                aria-label="Close add anime dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="modal-search"
              onSubmit={(event) => {
                event.preventDefault();
                void searchAniList();
              }}
            >
              <Search size={18} />
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Try Frieren, One Piece, Jujutsu Kaisen…"
              />
              <button
                className="primary-button"
                type="submit"
                disabled={searching}
              >
                {searching ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <Search size={16} />
                )}
                Search
              </button>
            </form>

            {results.length > 0 && (
              <div className="search-results">
                {results.map((item) => (
                  <div className="result-row" key={item.sourceId}>
                    {item.coverImage ? (
                      <img src={item.coverImage} alt="" />
                    ) : (
                      <div className="result-placeholder">
                        <Sparkles />
                      </div>
                    )}
                    <div className="result-copy">
                      <strong>{item.englishTitle || item.title}</strong>
                      <span>
                        {item.title}
                        {item.totalEpisodes
                          ? ` · ${item.totalEpisodes} episodes`
                          : ""}
                      </span>
                      <small>{item.genres.slice(0, 3).join(" · ")}</small>
                    </div>
                    <button
                      className="add-result"
                      onClick={() => void addAnime(item)}
                    >
                      <Plus size={15} /> Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="manual-add">
              <span>Can’t find it?</span>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (manualTitle.trim()) {
                    void addAnime({ title: manualTitle.trim() });
                  }
                }}
              >
                <input
                  value={manualTitle}
                  onChange={(event) => setManualTitle(event.target.value)}
                  placeholder="Add a title manually"
                />
                <button type="submit" disabled={!manualTitle.trim()}>
                  <Plus size={15} /> Add title
                </button>
              </form>
            </div>

            <div className="modal-footnote">
              <Sparkles size={14} />
              MyAnimeList account sync is not configured in this starter.
            </div>
          </section>
        </div>
      )}

      {detail && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDetail(null);
            }
          }}
        >
          <section className="modal detail-modal">
            <div className="detail-top">
              <div className="detail-cover">
                {detail.coverImage ? (
                  <img src={detail.coverImage} alt="" />
                ) : (
                  <Sparkles size={30} />
                )}
              </div>

              <div className="detail-main">
                <div className="section-kicker">ANIME DETAILS</div>
                <h2>{detail.englishTitle || detail.title}</h2>
                <p>{detail.title}</p>
                <span
                  className={`status-badge ${detail.status.toLowerCase()}`}
                >
                  {activeLabel(detail.status)}
                </span>
                <div className="detail-progress">
                  Episode {Math.max(1, detail.currentEpisode)} · Season{" "}
                  {detail.currentSeason}
                  {detail.totalEpisodes
                    ? ` of ${detail.totalEpisodes}`
                    : ""}
                </div>
              </div>

              <button
                className="icon-button detail-close"
                onClick={() => setDetail(null)}
                aria-label="Close anime details"
              >
                <X size={18} />
              </button>
            </div>

            {detail.synopsis && (
              <p className="detail-synopsis">
                {detail.synopsis
                  .replace(/<[^>]*>/g, " ")
                  .slice(0, 650)}
                {detail.synopsis.length > 650 ? "…" : ""}
              </p>
            )}

            <div className="detail-fields">
              <label>
                Status
                <select
                  value={detail.status}
                  onChange={(event) => {
                    const status = event.target.value;
                    setDetail({ ...detail, status });
                    void updateAnime(detail.id, { status });
                  }}
                >
                  {statuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                My rating
                <select
                  value={detail.userRating ?? ""}
                  onChange={(event) => {
                    const value = event.target.value
                      ? Number(event.target.value)
                      : null;
                    setDetail({ ...detail, userRating: value });
                    void updateAnime(detail.id, { userRating: value });
                  }}
                >
                  <option value="">Not rated</option>
                  {Array.from({ length: 10 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}/10
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Priority
                <select
                  value={detail.priority}
                  onChange={(event) => {
                    const priority = event.target.value;
                    setDetail({ ...detail, priority });
                    void updateAnime(detail.id, { priority });
                  }}
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="MUST_WATCH">Must watch</option>
                </select>
              </label>
            </div>

            <div className="episode-entry">
              <div className="entry-title">
                <Check size={16} />
                Record an episode
                <span>Saved to your local history</span>
              </div>

              <div className="episode-entry-row">
                <div className="episode-number">
                  S{detail.currentSeason} · E
                  {Math.max(1, detail.currentEpisode)}
                </div>

                <button
                  className="secondary-button"
                  onClick={() =>
                    window.open(
                      `https://reanime.to/search?query=${encodeURIComponent(
                        `${detail.englishTitle || detail.title} episode ${Math.max(1, detail.currentEpisode)}`
                      )}`,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                >
                  <ExternalLink size={14} /> Watch on Re:Anime
                </button>

                <label className="rating-select">
                  <Star size={14} />
                  <select
                    value={episodeRating}
                    onChange={(event) =>
                      setEpisodeRating(event.target.value)
                    }
                    aria-label="Episode rating"
                  >
                    {Array.from({ length: 10 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {index + 1}/10
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  className="primary-button"
                  onClick={() => void markWatched(detail)}
                >
                  <Check size={15} /> Mark watched
                </button>
              </div>

              <textarea
                value={episodeNote}
                onChange={(event) => setEpisodeNote(event.target.value)}
                placeholder="Episode notes (optional): favourite moment, theory, or reminder…"
                rows={2}
              />
            </div>

            <div className="history-section">
              <div className="history-heading">
                <h3>
                  <History size={16} /> Recent episode history
                </h3>
                <span>{history.length} records</span>
              </div>

              {history.length === 0 ? (
                <p className="history-empty">
                  No episodes logged yet. Record your first episode above.
                </p>
              ) : (
                <div className="history-list">
                  {history.map((log) => (
                    <div className="history-item" key={log.id}>
                      <div className="history-episode">
                        S{log.seasonNumber} · E{log.episodeNumber}
                      </div>
                      <div className="history-date">
                        {new Date(log.watchedAt).toLocaleString()}
                      </div>
                      {log.rewatch && (
                        <span className="rewatch-tag">Rewatch</span>
                      )}
                      {log.rating != null && (
                        <span className="history-rating">
                          <Star size={12} fill="currentColor" /> {log.rating}/10
                        </span>
                      )}
                      {log.notes && <p>{log.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="detail-bottom">
              <button
                className="delete-button"
                onClick={() => void removeAnime(detail)}
              >
                <Trash2 size={14} /> Remove from library
              </button>
              <button
                className="secondary-button"
                onClick={() => setDetail(null)}
              >
                Done
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
