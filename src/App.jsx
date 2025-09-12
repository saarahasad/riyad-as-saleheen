import React, { useEffect, useMemo, useState } from "react";
import "./index.css";

export default function App() {
  // --- state ---
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [chapterFilter, setChapterFilter] = useState(0);
  const [hadithNumber, setHadithNumber] = useState(1);
  const [lang, setLang] = useState("english");
  const bgImages = [
    "https://images.pexels.com/photos/158063/bellingrath-gardens-alabama-landscape-scenic-158063.jpeg",
    "https://images.pexels.com/photos/158028/bellingrath-gardens-alabama-landscape-scenic-158028.jpeg",
    "https://images.pexels.com/photos/5748921/pexels-photo-5748921.jpeg",
    "https://images.pexels.com/photos/13082420/pexels-photo-13082420.jpeg",
    "https://images.pexels.com/photos/760042/pexels-photo-760042.jpeg",
    "https://images.pexels.com/photos/21529778/pexels-photo-21529778.jpeg",
    "https://images.pexels.com/photos/3713816/pexels-photo-3713816.jpeg",
    "https://images.pexels.com/photos/29095734/pexels-photo-29095734.jpeg",


   
  ];
  
  
  const [bgIndex, setBgIndex] = useState(0);

  // --- load JSON ---
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/riyad.json");
        if (!res.ok)
          throw new Error(
            "Could not load /riyad.json. Put your file in public/riyad.json"
          );
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        console.error(err);
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => (cancelled = true);
  }, []);

  // --- indexing: chapters and hadiths by chapter ---
  const chapters = useMemo(() => {
    if (!data) return [];
    return (data.chapters || []).slice().sort((a, b) => a.id - b.id);
  }, [data]);

  const hadithsByChapter = useMemo(() => {
    if (!data) return {};
    const map = {};
    (data.hadiths || []).forEach((h) => {
      const cid = Number(h.chapterId || 0);
      if (!map[cid]) map[cid] = [];
      map[cid].push(h);
    });
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => (a.idInBook || 0) - (b.idInBook || 0));
    });
    return map;
  }, [data]);

  // when chapters load or chapterFilter changes, reset hadithNumber to first in chapter
  useEffect(() => {
    const arr = hadithsByChapter[chapterFilter] || [];
    if (arr.length > 0) setHadithNumber(arr[0].idInBook);
    else setHadithNumber(1);
    setBgIndex((i) => (i + 1) % bgImages.length);
  }, [chapterFilter, hadithsByChapter]);

  // ensure chapterFilter exists in data
  useEffect(() => {
    if (!data) return;
    const ids = (data.chapters || []).map((c) => Number(c.id));
    if (!ids.includes(chapterFilter)) setChapterFilter(0);
  }, [data]);

  const currentHadith = useMemo(() => {
    if (!data) return null;
    const arr = hadithsByChapter[chapterFilter] || [];
    return arr.find((h) => Number(h.idInBook) === Number(hadithNumber)) || null;
  }, [hadithsByChapter, chapterFilter, hadithNumber, data]);

  // compute hadith position inside chapter
  const hadithPosInfo = useMemo(() => {
    const arr = hadithsByChapter[chapterFilter] || [];
    if (!arr || arr.length === 0) return { pos: 0, total: 0, idx: -1 };
    const idx = arr.findIndex(
      (h) => Number(h.idInBook) === Number(hadithNumber)
    );
    return { pos: idx >= 0 ? idx + 1 : 0, total: arr.length, idx };
  }, [hadithsByChapter, chapterFilter, hadithNumber]);

  const hasPrev = hadithPosInfo.idx > 0;
  const hasNext =
    hadithPosInfo.idx >= 0 && hadithPosInfo.idx < hadithPosInfo.total - 1;

  // bump bg image when user navigates
  function bumpBg() {
    setBgIndex((i) => (i + 1) % bgImages.length);
  }

  function gotoNext() {
    const arr = hadithsByChapter[chapterFilter] || [];
    if (!arr.length) return;
    const idx = arr.findIndex(
      (h) => Number(h.idInBook) === Number(hadithNumber)
    );
    const nextIdx = Math.min(arr.length - 1, idx + 1);
    if (nextIdx !== idx) {
      setHadithNumber(arr[nextIdx].idInBook);
      bumpBg();
    }
  }
  function gotoPrev() {
    const arr = hadithsByChapter[chapterFilter] || [];
    if (!arr.length) return;
    const idx = arr.findIndex(
      (h) => Number(h.idInBook) === Number(hadithNumber)
    );
    const prevIdx = Math.max(0, idx - 1);
    if (prevIdx !== idx) {
      setHadithNumber(arr[prevIdx].idInBook);
      bumpBg();
    }
  }

  // --- search UI ---
  const filteredHadiths = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const hadiths = data.hadiths || [];
    if (!q) return hadiths;
    return hadiths.filter((h) => {
      const engText =
        (h.english &&
          (h.english.narrator || "") + " " + (h.english.text || "")) ||
        "";
      const arabText = h.arabic || "";
      return (
        engText.toLowerCase().includes(q) || arabText.toLowerCase().includes(q)
      );
    });
  }, [data, query]);

  function onSelectSearchResult(h) {
    setChapterFilter(Number(h.chapterId || 0));
    setHadithNumber(h.idInBook);
    bumpBg();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setQuery("");
  }

  // ------------------ Smart highlighting (TF-IDF + RAKE) ------------------
  // Stopwords
  const EN_STOPWORDS = useMemo(
    () =>
      new Set([
        "the",
        "and",
        "a",
        "an",
        "of",
        "in",
        "on",
        "to",
        "is",
        "are",
        "be",
        "was",
        "were",
        "it",
        "this",
        "that",
        "he",
        "she",
        "they",
        "we",
        "you",
        "i",
        "his",
        "her",
        "their",
        "for",
        "with",
        "as",
        "at",
        "by",
        "from",
        "not",
        "but",
        "or",
        "which",
        "have",
        "has",
        "had",
        "do",
        "does",
        "did",
        "so",
        "then",
        "when",
        "what",
        "my",
        "me",
        "your",
        "our",
        "us",
        "its",
        "will",
        "shall",
        "may",
        "who",
        "whom",
        "there",
        "here",
        "also",
        "shall",
        "may",
        "let",
        "upon",
      ]),
    []
  );

  function tokenizeEnglish(text) {
    if (!text) return [];
    return text
      .replace(/[’'`"]/g, "'")
      .replace(/[\u2013\u2014]/g, " ")
      .replace(/[^\p{L}\p{N}'-]+/gu, " ")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  }

  // build corpus stats (DF and IDF) once after data loads
  const [corpusStats, setCorpusStats] = useState(null);
  useEffect(() => {
    if (!data) return;
    const docs = (data.hadiths || []).map((h) => {
      const eng = (h.english && h.english.text) || "";
      return tokenizeEnglish(eng);
    });
    const df = Object.create(null);
    docs.forEach((tokens) => {
      const seen = new Set();
      tokens.forEach((t) => {
        if (EN_STOPWORDS.has(t) || t.length <= 2) return;
        if (!seen.has(t)) {
          seen.add(t);
          df[t] = (df[t] || 0) + 1;
        }
      });
    });
    const N = Math.max(1, docs.length);
    const idf = Object.create(null);
    Object.entries(df).forEach(([term, count]) => {
      idf[term] = Math.log((N + 1) / (count + 1)) + 1;
    });
    setCorpusStats({ N, df, idf });
  }, [data, EN_STOPWORDS]);

  function computeTfIdfForText(text, corpusStatsLocal) {
    const tokens = tokenizeEnglish(text);
    const tf = Object.create(null);
    tokens.forEach((t) => {
      if (EN_STOPWORDS.has(t) || t.length <= 2) return;
      tf[t] = (tf[t] || 0) + 1;
    });
    const maxTf = Math.max(1, ...Object.values(tf));
    const tfidf = Object.create(null);
    Object.entries(tf).forEach(([t, count]) => {
      const tfNorm = count / maxTf;
      const idf =
        (corpusStatsLocal && corpusStatsLocal.idf[t]) ||
        Math.log(((corpusStatsLocal ? corpusStatsLocal.N : 1) + 1) / 1) + 1;
      tfidf[t] = tfNorm * idf;
    });
    return { tf, tfidf, tokens };
  }

  function extractRakePhrases(text, topN = 8) {
    if (!text) return [];
    const words = tokenizeEnglish(text);
    const phrases = [];
    let cur = [];
    words.forEach((w) => {
      if (EN_STOPWORDS.has(w)) {
        if (cur.length) {
          phrases.push(cur.join(" "));
          cur = [];
        }
      } else {
        cur.push(w);
      }
    });
    if (cur.length) phrases.push(cur.join(" "));

    const freq = Object.create(null);
    const degree = Object.create(null);
    phrases.forEach((p) => {
      const ws = p.split(" ");
      ws.forEach((w) => {
        freq[w] = (freq[w] || 0) + 1;
        degree[w] = (degree[w] || 0) + ws.length;
      });
    });

    const wordScore = Object.create(null);
    Object.keys(freq).forEach((w) => {
      wordScore[w] = (degree[w] || 0) / freq[w];
    });

    const scored = phrases
      .map((p) => {
        const score = p.split(" ").reduce((s, w) => s + (wordScore[w] || 0), 0);
        return { phrase: p, score };
      })
      .sort((a, b) => b.score - a.score);

    const seen = new Set();
    const out = [];
    for (const s of scored) {
      if (seen.has(s.phrase)) continue;
      seen.add(s.phrase);
      out.push(s);
      if (out.length >= topN) break;
    }
    return out;
  }

  function mergeAndRank(
    tfidfObj,
    rakeList,
    opts = { topWords: 6, topPhrases: 4, phraseWeight: 1.4 }
  ) {
    const { tfidf } = tfidfObj;
    const wordEntries = Object.entries(tfidf).sort((a, b) => b[1] - a[1]);
    const topWords = wordEntries.slice(0, opts.topWords).map((e) => e[0]);
    const topPhrases = (rakeList || [])
      .slice(0, opts.topPhrases)
      .map((p) => p.phrase);
    const scoreMap = Object.create(null);
    topWords.forEach((w, i) => {
      scoreMap[w] = (scoreMap[w] || 0) + (opts.topWords - i) + (tfidf[w] || 0);
    });
    topPhrases.forEach((ph, i) => {
      scoreMap[ph] =
        (scoreMap[ph] || 0) + (opts.topPhrases - i) * opts.phraseWeight;
    });
    const combined = Object.entries(scoreMap)
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0]);
    return combined;
  }

  const THEME_KEYWORDS = {
    "Prayer & Worship": [
      "pray",
      "prayer",
      "worship",
      "salah",
      "fast",
      "dhikr",
      "supplication",
      "dua",
    ],
    "Charity / Giving": [
      "charity",
      "give",
      "alms",
      "zakah",
      "sadaqah",
      "donate",
      "feeding",
    ],
    "Patience / Perseverance": [
      "patience",
      "sabr",
      "endure",
      "steadfast",
      "persevere",
    ],
    "Truth & Honesty": [
      "truth",
      "honest",
      "lie",
      "lying",
      "trust",
      "falsehood",
    ],
    "Modesty / Manners": [
      "modest",
      "modesty",
      "manners",
      "behaviour",
      "shyness",
      "respect",
      "etiquette",
    ],
    "Knowledge / Teaching": [
      "knowledge",
      "learn",
      "teach",
      "scholar",
      "know",
      "ilm",
      "study",
    ],
    "Death / Afterlife": [
      "death",
      "grave",
      "afterlife",
      "resurrection",
      "hereafter",
      "paradise",
      "hell",
      "jannah",
      "jahannam",
    ],
    "Family / Relations": [
      "wife",
      "husband",
      "family",
      "children",
      "parent",
      "relatives",
      "kinship",
      "brother",
      "sister",
    ],
    "Forgiveness / Repentance": [
      "forgive",
      "forgiveness",
      "pardon",
      "repent",
      "repentance",
      "tawbah",
      "mercy",
    ],
    "Justice / Fairness": [
      "justice",
      "fair",
      "equity",
      "judge",
      "oppress",
      "oppression",
      "rights",
    ],
    "Gratitude / Thankfulness": [
      "gratitude",
      "thank",
      "thanks",
      "shukr",
      "grateful",
    ],
    "Generosity / Kindness": [
      "generous",
      "kind",
      "compassion",
      "mercy",
      "rahma",
      "gentle",
      "soft",
    ],
    "Courage / Striving": [
      "courage",
      "bravery",
      "jihad",
      "strive",
      "striving",
      "effort",
      "sacrifice",
    ],
    Humility: ["humble", "humility", "arrogant", "arrogance", "pride"],
  };

  function detectThemes(text) {
    if (!text) return [];
    const t = text.toLowerCase();
    const out = [];
    Object.entries(THEME_KEYWORDS).forEach(([theme, keys]) => {
      for (const k of keys) {
        if (t.includes(k)) {
          out.push(theme);
          break;
        }
      }
    });
    return out;
  }

  function highlightEnglishWithStrong(text, items = []) {
    if (!text) return text || "";
    if (!items || items.length === 0) return text;
    const sorted = [...new Set(items)]
      .slice()
      .sort((a, b) => b.length - a.length)
      .filter(Boolean);
    const escaped = sorted.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "ig");
    const parts = [];
    let last = 0;
    let m;
    while ((m = pattern.exec(text)) !== null) {
      const idx = m.index;
      if (idx > last) parts.push(text.slice(last, idx));
      parts.push(
        React.createElement("strong", { key: idx, className: "kw-en" }, m[0])
      );
      last = idx + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }

  // --- Sentence scoring & highlighting helpers ---
  function splitSentences(text) {
    if (!text) return [];
    // keep punctuation on sentence and split on sentence boundaries
    return text
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function scoreSentences(sentences, tfidfObj, themesList) {
    return sentences
      .map((s) => {
        let score = 0;
        const lower = s.toLowerCase();
        // score by tfidf keywords (sum of tfidf values for contained tokens)
        Object.entries(tfidfObj.tfidf || {}).forEach(([k, v]) => {
          if (k && lower.includes(k)) score += v;
        });
        // theme bonus: if any theme keyword found, add small bonus
        (themesList || []).forEach((theme) => {
          if (lower.includes(theme.toLowerCase())) score += 1.8;
        });
        // small length bonus to avoid favoring tiny sentences
        score += Math.min(1.0, s.length / 120);
        return { text: s, score };
      })
      .sort((a, b) => b.score - a.score);
  }

  function highlightImportantSentences(text, tfidfObj, themesList) {
    const sentences = splitSentences(text);
    if (sentences.length === 0) return text;

    const scored = scoreSentences(sentences, tfidfObj, themesList);

    // pick top 1–2 sentences
    const topCount = Math.min(2, sentences.length);
    const top = new Set(scored.slice(0, topCount).map((s) => s.text));

    return sentences.map((s, i) =>
      top.has(s) ? (
        <mark key={i} className="important-sentence">
          {s}{" "}
        </mark>
      ) : (
        <span key={i}>{s} </span>
      )
    );
  }

  // compute highlights for current hadith (TF-IDF items + themes + tfidfObj)
  const smartHighlights = useMemo(() => {
    if (!currentHadith || !corpusStats)
      return { items: [], themes: [], tfidfObj: { tfidf: {} } };
    const engText = (currentHadith.english && currentHadith.english.text) || "";
    const tfidfObj = computeTfIdfForText(engText, corpusStats);
    const rakeList = extractRakePhrases(engText, 10);
    const merged = mergeAndRank(tfidfObj, rakeList, {
      topWords: 6,
      topPhrases: 5,
      phraseWeight: 1.6,
    });
    const filtered = merged.filter((x) => x && x.length > 2).slice(0, 8);
    const themes = detectThemes(engText);
    return { items: filtered, themes, tfidfObj };
  }, [currentHadith, corpusStats]);

  // keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowLeft") gotoPrev();
      if (e.key === "ArrowRight") gotoNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hadithNumber, chapterFilter, hadithsByChapter]);

  // --- render UI ---
  return (
    <div
      className="hadith-page"
      style={{ backgroundImage: `url(${bgImages[bgIndex]})` }}
    >
      <div className="overlay">
        <div className="container">
          <header className="header">
            <div className="title">Riyad as-Salihin</div>
            <div className="header-controls">
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="select"
              >
                <option value="english">English</option>
                <option value="arabic">Arabic</option>
              </select>
            </div>
          </header>

          <section className="controls-card">
            <div className="left">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Quick search across all hadiths..."
                className="input"
              />
              {query && (
                <div className="search-results">
                  {filteredHadiths.slice(0, 20).map((h) => (
                    <div
                      key={h.id}
                      onClick={() => onSelectSearchResult(h)}
                      className="res-item"
                    >
                      <div className="res-meta">
                        Chapter {h.chapterId} · Hadith {h.idInBook}
                      </div>
                      <div className="res-text">
                        {(h.english && h.english.narrator) ||
                          (h.arabic && h.arabic.slice(0, 80))}
                      </div>
                    </div>
                  ))}
                  {filteredHadiths.length === 0 && (
                    <div className="res-none">No results</div>
                  )}
                </div>
              )}
            </div>

            <div className="right">
              <select
                value={chapterFilter}
                onChange={(e) => setChapterFilter(Number(e.target.value))}
                className="select"
              >
                {(chapters.length
                  ? chapters
                  : [
                      {
                        id: 0,
                        english: "Book of Miscellany",
                        arabic: "كتاب المقدمات",
                      },
                    ]
                ).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id}. {c.english}
                  </option>
                ))}
              </select>

              <select
                value={hadithNumber}
                onChange={(e) => {
                  setHadithNumber(Number(e.target.value));
                  bumpBg();
                }}
                className="select small"
              >
                {(hadithsByChapter[chapterFilter] || []).map((h) => (
                  <option key={h.id} value={h.idInBook}>
                    #{h.idInBook} 
                  </option>
                ))}
              </select>
            </div>
          </section>

          <main className="hadith-card">
            <div className="chapter-line">
              Chapter:{" "}
              <strong>
                {
                  (
                    chapters.find((c) => c.id === chapterFilter) || {
                      english: "(Unknown)",
                      arabic: "",
                    }
                  ).english
                }
              </strong>
              {chapters.find((c) => c.id === chapterFilter)?.arabic ? (
                <span className="arabic-name">
                  {" "}
                  — {chapters.find((c) => c.id === chapterFilter).arabic}
                </span>
              ) : null}
            </div>

            <div className="card-content">
              {loading && <div className="muted">Loading...</div>}
              {!loading && !data && (
                <div className="error">
                  Could not load <code>/riyad.json</code>. Put your file in
                  public/riyad.json
                </div>
              )}

              {!loading && data && !currentHadith && (
                <div className="muted">
                  No hadith found for Chapter {chapterFilter} Hadith #
                  {hadithNumber}.
                </div>
              )}

              {!loading && data && currentHadith && (
                <article>
                  <div className="meta-row">
                    <div>
                      <div className="meta-small">
                        Chapter {currentHadith.chapterId} · Hadith #
                        {currentHadith.idInBook} — Hadith {hadithPosInfo.pos} of{" "}
                        {hadithPosInfo.total}
                      </div>
                    
                    </div>
                    <div className="muted">Unique ID: {currentHadith.id}</div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    {smartHighlights.themes &&
                      smartHighlights.themes.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          {smartHighlights.themes.map((t) => (
                            <p
                              key={t}
                              onClick={() => setQuery(t)}
                              className="theme-chip"
                            >
                              {t}
                            </p>
                          ))}
                        </div>
                      )}
                  </div>

                  <div className="hadith-body">
                    {lang === "english" ? (
                      <div>
                        <div className="narrator">
                          {currentHadith.english &&
                            currentHadith.english.narrator}
                        </div>

                        {/* important sentences highlighted AND words/phrases bolded inside */}
                        <div className="eng-text">
                          {highlightImportantSentences(
                            (currentHadith.english &&
                              currentHadith.english.text) ||
                              "",
                            smartHighlights.tfidfObj,
                            smartHighlights.themes
                          )}
                        </div>

                        {currentHadith.arabic && (
                          <div className="arabic-small" dir="rtl">
                            {currentHadith.arabic}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="arabic-only" dir="rtl">
                        {currentHadith.arabic}
                      </div>
                    )}
                  </div>
                </article>
              )}
            </div>
          </main>

          <footer className="footer-note">

          </footer>
        </div>
      </div>

      <div className="fixed-nav">
        <button
          className={`nav-btn ${!hasPrev ? "disabled" : ""}`}
          onClick={gotoPrev}
          disabled={!hasPrev}
        >
          Prev
        </button>
        <div className="nav-center">
          <div className="nav-line">
            Chapter {chapterFilter} · Hadith #{hadithNumber}
          </div>
          <div className="nav-sub">
            Hadith {hadithPosInfo.pos} of {hadithPosInfo.total}
          </div>
        </div>
        <button
          className={`nav-btn ${!hasNext ? "disabled" : ""}`}
          onClick={gotoNext}
          disabled={!hasNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}
