import React, { useEffect, useMemo, useState, useRef } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { api } from "../../utils/apiClient";

import {
  Search,
  HelpCircle,
  User,
  Dumbbell,
  UtensilsCrossed,
  CreditCard,
  ShieldCheck,
  Smartphone,
  ChevronDown,
  Rocket,
  MessageSquare,
  Mail,
  Phone,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  X,
} from "lucide-react";
import "./FAQs.css";

// ═══════════════════════════════════════════════════════════════════
//  SEARCH ENGINE
// ═══════════════════════════════════════════════════════════════════

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "is",
  "it",
  "its",
  "as",
  "be",
  "was",
  "are",
  "were",
  "has",
  "have",
  "had",
  "do",
  "does",
  "did",
  "will",
  "can",
  "could",
  "would",
  "should",
  "may",
  "might",
  "shall",
  "i",
  "my",
  "me",
  "we",
  "our",
  "you",
  "your",
  "he",
  "she",
  "they",
  "their",
  "this",
  "that",
  "these",
  "those",
  "not",
  "no",
  "so",
  "if",
  "then",
  "than",
  "when",
  "how",
  "what",
  "which",
  "who",
  "where",
  "why",
  "there",
  "here",
  "about",
  "into",
  "just",
  "also",
  "more",
  "some",
  "any",
  "all",
  "each",
  "other",
  "get",
  "use",
  "need",
  "want",
]);

const SYNONYM_GROUPS = [
  ["account", "profile", "login", "signin", "sign in", "register", "signup", "sign up", "credentials"],
  ["password", "passwd", "passcode", "pin", "secret", "credentials"],
  ["gym", "fitness center", "health club", "workout facility", "exercise center"],
  ["workout", "exercise", "training", "session", "routine", "program", "plan"],
  ["nutrition", "diet", "food", "eating", "meal", "calories", "macros", "nutrition plan"],
  ["billing", "payment", "subscription", "charge", "invoice", "receipt", "fee", "cost", "price", "pricing"],
  ["cancel", "cancellation", "unsubscribe", "terminate", "end", "stop", "quit"],
  ["free", "no cost", "zero cost", "gratis", "complimentary", "no charge"],
  ["premium", "paid", "pro", "upgrade", "plus", "elite", "vip", "membership"],
  ["app", "application", "mobile", "phone", "ios", "android", "smartphone", "device"],
  ["privacy", "security", "data", "personal information", "gdpr", "protection", "safe", "secure"],
  ["support", "help", "assistance", "contact", "customer service", "cs", "faq"],
  ["delete", "remove", "deactivate", "close", "disable", "terminate"],
  ["update", "change", "edit", "modify", "adjust", "set"],
  ["notification", "alert", "reminder", "email", "push", "message", "sms"],
  ["partner", "affiliated", "certified", "listed", "registered"],
  ["review", "rating", "feedback", "comment", "star", "score", "testimonial"],
  ["search", "find", "discover", "look for", "browse", "explore", "locate"],
  ["schedule", "book", "reserve", "appointment", "slot", "availability", "calendar"],
  ["distance", "nearby", "close", "near me", "location", "around", "local"],
];

const SYNONYM_MAP = new Map();
for (const group of SYNONYM_GROUPS) {
  for (const term of group) {
    if (!SYNONYM_MAP.has(term)) SYNONYM_MAP.set(term, new Set());
    for (const other of group) {
      if (other !== term) SYNONYM_MAP.get(term).add(other);
    }
  }
}

function soundex(word) {
  if (!word) return "";
  const w = word.toUpperCase().replace(/[^A-Z]/g, "");
  if (!w) return "";
  const MAP = {
    B: 1,
    F: 1,
    P: 1,
    V: 1,
    C: 2,
    G: 2,
    J: 2,
    K: 2,
    Q: 2,
    S: 2,
    X: 2,
    Z: 2,
    D: 3,
    T: 3,
    L: 4,
    M: 5,
    N: 5,
    R: 6,
  };
  let code = w[0];
  let prev = MAP[w[0]] ?? 0;
  for (let i = 1; i < w.length && code.length < 4; i++) {
    const curr = MAP[w[i]] ?? 0;
    if (curr && curr !== prev) {
      code += curr;
    }
    prev = curr;
  }
  return code.padEnd(4, "0");
}

function stem(word) {
  let w = word.toLowerCase();
  if (w.endsWith("sses")) w = w.slice(0, -2);
  else if (w.endsWith("ies")) w = w.slice(0, -2);
  else if (w.endsWith("ss")) {
    // keep
  } else if (w.endsWith("s") && w.length > 3) w = w.slice(0, -1);

  if (w.endsWith("eed") && w.length > 4) w = w.slice(0, -1);
  else if (w.endsWith("ing") && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith("ed") && w.length > 4) w = w.slice(0, -2);

  if (w.endsWith("y") && w.length > 3) w = `${w.slice(0, -1)}i`;

  const step2 = [
    ["ational", "ate"],
    ["tional", "tion"],
    ["enci", "ence"],
    ["anci", "ance"],
    ["izer", "ize"],
    ["alism", "al"],
    ["ation", "ate"],
    ["ator", "ate"],
    ["iveness", "ive"],
    ["fulness", "ful"],
    ["ousness", "ous"],
    ["aliti", "al"],
    ["iviti", "ive"],
    ["biliti", "ble"],
  ];

  for (const [suf, rep] of step2) {
    if (w.endsWith(suf) && w.length > suf.length + 1) {
      w = w.slice(0, -suf.length) + rep;
      break;
    }
  }

  const step3 = [
    ["icate", "ic"],
    ["ative", ""],
    ["alize", "al"],
    ["iciti", "ic"],
    ["ical", "ic"],
    ["ness", ""],
    ["ful", ""],
  ];

  for (const [suf, rep] of step3) {
    if (w.endsWith(suf) && w.length > suf.length + 1) {
      w = w.slice(0, -suf.length) + rep;
      break;
    }
  }

  return w;
}

function tokenize(text, { removeStops = true, doStem = true } = {}) {
  return text
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .filter((w) => !removeStops || !STOP_WORDS.has(w))
    .map((w) => (doStem ? stem(w) : w));
}

function ngrams(tokens, n) {
  const result = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    result.push(tokens.slice(i, i + n).join(" "));
  }
  return result;
}

function expandQuery(rawQuery) {
  const lower = rawQuery.toLowerCase();
  const original = tokenize(lower, { removeStops: false, doStem: false });
  const stemmed = tokenize(lower, { removeStops: true, doStem: true });
  const expanded = new Set([...original, ...stemmed]);

  for (const [phrase, synonyms] of SYNONYM_MAP.entries()) {
    if (lower.includes(phrase)) {
      for (const syn of synonyms) {
        tokenize(syn, { removeStops: false, doStem: true }).forEach((t) => expanded.add(t));
      }
    }
  }

  const soundexCodes = new Set();
  for (const token of stemmed) {
    if (token.length > 3) soundexCodes.add(soundex(token));
  }

  return { terms: [...expanded], stemmed, soundexCodes, raw: lower };
}

function buildSearchIndex(faqs) {
  const docs = faqs.map((faq) => {
    const qTokens = tokenize(faq.question, { removeStops: true, doStem: true });
    const aTokens = tokenize(faq.answer, { removeStops: true, doStem: true });
    const bigrams = ngrams(qTokens, 2);
    const trigrams = ngrams(qTokens, 3);
    const soundexSet = new Set([
      ...qTokens.filter((t) => t.length > 3).map(soundex),
      ...aTokens.filter((t) => t.length > 3).map(soundex),
    ]);

    const tf = new Map();
    const allTokens = [...qTokens, ...aTokens];
    for (const t of allTokens) tf.set(t, (tf.get(t) ?? 0) + 1);

    return {
      faq,
      qTokens,
      aTokens,
      bigrams,
      trigrams,
      soundexSet,
      tf,
      len: allTokens.length,
    };
  });

  const N = docs.length;
  const df = new Map();

  for (const doc of docs) {
    const seen = new Set(doc.tf.keys());
    for (const term of seen) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const idf = new Map();
  for (const [term, freq] of df.entries()) {
    idf.set(term, Math.log((N - freq + 0.5) / (freq + 0.5) + 1));
  }

  const avgLen = docs.reduce((s, d) => s + d.len, 0) / (N || 1);
  return { docs, idf, avgLen, N };
}

const BM25_K1 = 1.5;
const BM25_B = 0.75;

function bm25Score(tf, idf, docLen, avgLen) {
  const norm = 1 - BM25_B + BM25_B * (docLen / avgLen);
  return idf * ((tf * (BM25_K1 + 1)) / (tf + BM25_K1 * norm));
}

function phraseBonus(text, rawQuery) {
  const t = text.toLowerCase();
  const q = rawQuery.toLowerCase();
  if (t.includes(q)) return 40;

  let bonus = 0;
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  for (let len = Math.min(words.length, 4); len >= 2; len--) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(" ");
      if (t.includes(phrase)) bonus += len * 6;
    }
  }
  return bonus;
}

function proximityBonus(tokens, queryTerms) {
  if (queryTerms.length < 2) return 0;

  const positions = new Map();
  tokens.forEach((t, i) => {
    if (!positions.has(t)) positions.set(t, []);
    positions.get(t).push(i);
  });

  let bonus = 0;
  for (let a = 0; a < queryTerms.length - 1; a++) {
    for (let b = a + 1; b < queryTerms.length; b++) {
      const posA = positions.get(queryTerms[a]) ?? [];
      const posB = positions.get(queryTerms[b]) ?? [];
      if (!posA.length || !posB.length) continue;

      let minDist = Infinity;
      for (const pa of posA) {
        for (const pb of posB) {
          minDist = Math.min(minDist, Math.abs(pa - pb));
        }
      }

      if (minDist === 1) bonus += 8;
      else if (minDist <= 3) bonus += 4;
      else if (minDist <= 6) bonus += 2;
    }
  }

  return bonus;
}

const WEIGHT = {
  question: 3.0,
  questionStart: 2.0,
  answer: 1.0,
  bigram: 1.8,
  trigram: 2.5,
  phonetic: 0.6,
  proximity: 1.0,
};

const INTENT_SIGNALS = [
  { patterns: [/\b(login|sign in|password|register|account|profile)\b/], category: "account", boost: 12 },
  { patterns: [/\b(gym|fitness|location|near|club|studio|partner)\b/], category: "gyms", boost: 12 },
  { patterns: [/\b(workout|exercise|train|routine|program|rep|set)\b/], category: "workouts", boost: 12 },
  { patterns: [/\b(eat|food|diet|calorie|macro|nutrition|meal|recipe)\b/], category: "nutrition", boost: 12 },
  { patterns: [/\b(pay|bill|charge|subscription|cancel|refund|price)\b/], category: "billing", boost: 12 },
  { patterns: [/\b(privacy|data|gdpr|safe|secure|delete account)\b/], category: "privacy", boost: 12 },
  { patterns: [/\b(app|ios|android|phone|bug|crash|error|slow)\b/], category: "technical", boost: 12 },
];

function detectIntentBoost(rawQuery, faqCategory) {
  let boost = 0;
  for (const signal of INTENT_SIGNALS) {
    if (signal.category !== faqCategory) continue;
    for (const re of signal.patterns) {
      if (re.test(rawQuery)) {
        boost += signal.boost;
        break;
      }
    }
  }
  return boost;
}

function searchFaqs(query, faqs, index, category = "all") {
  const q = query.trim();
  if (!q) {
    return category === "all" ? faqs : faqs.filter((f) => f.category === category);
  }

  const { terms, stemmed, soundexCodes, raw } = expandQuery(q);
  const { docs, idf, avgLen } = index;
  const results = [];

  for (const doc of docs) {
    if (category !== "all" && doc.faq.category !== category) continue;

    let score = 0;

    for (const term of stemmed) {
      const tf_a = doc.aTokens.filter((t) => t === term).length;
      const qtf = doc.qTokens.filter((t) => t === term).length;
      const termIdf = idf.get(term) ?? Math.log(1 + 1);

      if (qtf > 0) score += WEIGHT.question * bm25Score(qtf, termIdf, doc.qTokens.length, avgLen * 0.4);
      if (tf_a > 0) score += WEIGHT.answer * bm25Score(tf_a, termIdf, doc.aTokens.length, avgLen * 0.6);
    }

    score += WEIGHT.question * phraseBonus(doc.faq.question, raw);
    score += WEIGHT.answer * phraseBonus(doc.faq.answer, raw) * 0.5;

    const qLower = doc.faq.question.toLowerCase();
    if (qLower.startsWith(raw)) score += 30 * WEIGHT.questionStart;
    else if (raw.split(" ").every((w) => qLower.includes(w))) score += 15;

    const queryBigrams = ngrams(stemmed, 2);
    const queryTrigrams = ngrams(stemmed, 3);

    for (const bg of queryBigrams) {
      if (doc.bigrams.includes(bg)) score += 10 * WEIGHT.bigram;
    }
    for (const tg of queryTrigrams) {
      if (doc.trigrams.includes(tg)) score += 18 * WEIGHT.trigram;
    }

    let phoneticHits = 0;
    for (const code of soundexCodes) {
      if (doc.soundexSet.has(code)) phoneticHits++;
    }
    score += phoneticHits * 4 * WEIGHT.phonetic;

    score += WEIGHT.proximity * proximityBonus([...doc.qTokens, ...doc.aTokens], stemmed);
    score += detectIntentBoost(raw, doc.faq.category);

    for (const qt of terms) {
      if (qt.length < 3) continue;
      for (const dt of doc.qTokens) {
        if (dt.startsWith(qt) && dt !== qt) score += 3;
      }
    }

    const hitsQ = stemmed.filter((t) => doc.qTokens.includes(t)).length;
    const hitsA = stemmed.filter((t) => doc.aTokens.includes(t)).length;
    if (hitsQ > 0 && hitsA > 0) score += 5;

    const covered = stemmed.filter((t) => doc.tf.has(t)).length;
    const coverage = stemmed.length > 0 ? covered / stemmed.length : 0;
    score *= 0.5 + 0.5 * coverage;

    if (score > 0.5) results.push({ faq: doc.faq, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.map((r) => r.faq);
}

// ═══════════════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════════════

function safeStr(v) {
  return v == null ? "" : String(v);
}

function toId(label) {
  return safeStr(label).trim().toLowerCase();
}

async function fetchFaqsAllActive() {
  const fetchPage = async (page) => {
    const res = await api.get("/faqs", {
      params: { page, per_page: 50 },
    });
    return res.data;
  };

  const first = await fetchPage(1);
  const paginator = first?.data || first;
  const firstRows = Array.isArray(paginator?.data) ? paginator.data : [];
  const lastPage = Number(paginator?.last_page || 1);

  let merged = [...firstRows];

  if (lastPage > 1) {
    const promises = [];
    for (let p = 2; p <= lastPage; p++) {
      promises.push(fetchPage(p));
    }

    const rest = await Promise.all(promises);
    for (const r of rest) {
      const pag = r?.data || r;
      const arr = Array.isArray(pag?.data) ? pag.data : [];
      merged.push(...arr);
    }
  }

  return merged.filter((r) => !!r.is_active);
}

async function fetchPublicSettings() {
  const res = await api.get("/settings/public");
  return res.data?.data || {};
}

function buildGmailComposeUrl({ to, subject, body }) {
  const params = new URLSearchParams();
  params.set("view", "cm");
  params.set("fs", "1");
  params.set("to", safeStr(to));
  if (subject) params.set("su", safeStr(subject));
  if (body) params.set("body", safeStr(body));
  return `https://mail.google.com/mail/?${params.toString()}`;
}

// ═══════════════════════════════════════════════════════════════════
//  CATEGORIES
// ═══════════════════════════════════════════════════════════════════

const CATEGORIES = [
  { id: "all", label: "All topics", icon: HelpCircle },
  { id: "account", label: "Account", icon: User },
  { id: "gyms", label: "Gyms", icon: Dumbbell },
  { id: "workouts", label: "Workouts", icon: Rocket },
  { id: "nutrition", label: "Nutrition", icon: UtensilsCrossed },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "privacy", label: "Privacy", icon: ShieldCheck },
  { id: "technical", label: "Technical", icon: Smartphone },
];

const QUICK_SEARCHES = ["create account", "gym reviews", "meal planner", "always free"];

// ═══════════════════════════════════════════════════════════════════
//  FAQ ITEM
// ═══════════════════════════════════════════════════════════════════

function FaqItem({ faq, index, isOpen, onToggle, catMeta, gmailUrl }) {
  const [helpful, setHelpful] = useState(null);
  const Icon = catMeta?.icon || HelpCircle;

  const handleHelpful = (e, val) => {
    e.stopPropagation();
    setHelpful((p) => (p === val ? null : val));
  };

  return (
    <div
      className={`fq-item ${isOpen ? "fq-item--open" : ""}`}
      style={{ "--idx": index }}
      onClick={onToggle}
    >
      <div className="fq-item__head">
        <span className="fq-item__n">{String(index + 1).padStart(2, "0")}</span>
        <div className="fq-item__ico">
          <Icon size={13} />
        </div>
        <p className="fq-item__q">{faq.question}</p>
        <ChevronDown size={13} className={`fq-item__chev ${isOpen ? "fq-item__chev--open" : ""}`} />
      </div>

      <div className="fq-item__body">
        <div className="fq-item__body-inner">
          <span className="fq-item__cat-tag">{catMeta?.label}</span>
          <p className="fq-item__ans">{faq.answer}</p>

          <div className="fq-item__foot" onClick={(e) => e.stopPropagation()}>
            <span className="fq-item__foot-lbl">Helpful?</span>

            <button
              className={`fq-vote fq-vote--yes ${helpful === "yes" ? "fq-vote--active" : ""}`}
              onClick={(e) => handleHelpful(e, "yes")}
            >
              <ThumbsUp size={11} />
              <span>Yes</span>
            </button>

            <button
              className={`fq-vote fq-vote--no ${helpful === "no" ? "fq-vote--active" : ""}`}
              onClick={(e) => handleHelpful(e, "no")}
            >
              <ThumbsDown size={11} />
              <span>No</span>
            </button>

            {helpful === "no" && (
              <a
                href={gmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="fq-vote-cta"
                onClick={(e) => e.stopPropagation()}
              >
                Contact support <ArrowRight size={10} />
              </a>
            )}

            {helpful === "yes" && <span className="fq-vote-thanks">Thanks!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

export default function FAQsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeFaq, setActiveFaq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [faqs, setFaqs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [heroIn, setHeroIn] = useState(false);
  const [searchIndex, setSearchIndex] = useState(null);

  const searchRef = useRef(null);

  const categoryIdByLabel = useMemo(() => {
    const m = new Map();
    for (const c of CATEGORIES) m.set(toId(c.label), c.id);
    return m;
  }, []);

  useEffect(() => {
    let alive = true;

    setLoading(true);
    setLoadErr("");

    fetchFaqsAllActive()
      .then((rows) => {
        if (!alive) return;

        const mapped = rows
          .map((r) => {
            const id = categoryIdByLabel.get(toId(r.category)) || "all";
            return {
              faq_id: r.faq_id,
              category: id,
              display_order: Number.isFinite(Number(r.display_order)) ? Number(r.display_order) : 0,
              question: safeStr(r.question),
              answer: safeStr(r.answer),
            };
          })
          .sort((a, b) => a.display_order - b.display_order || a.faq_id - b.faq_id);

        setFaqs(mapped);
        setSearchIndex(buildSearchIndex(mapped));
      })
      .catch((e) => {
        if (alive) {
          setFaqs([]);
          setLoadErr(
            e?.response?.data?.message ||
              e?.response?.data?.error ||
              e?.message ||
              "Failed to load FAQs."
          );
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [categoryIdByLabel]);

  useEffect(() => {
    let alive = true;

    fetchPublicSettings()
      .then((d) => {
        if (alive) setSettings(d);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setHeroIn(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setActiveFaq(null);
  }, [activeCategory, searchQuery]);

  const supportEmail = useMemo(() => {
    return safeStr(settings?.support_email) || safeStr(settings?.contact_email) || "support@exersearch.com";
  }, [settings]);

  const contactPhone = useMemo(() => {
    return safeStr(settings?.contact_phone) || "+63 917 123 4567";
  }, [settings]);

  const gmailUrl = useMemo(() => {
    return buildGmailComposeUrl({
      to: supportEmail,
      subject: "Support Request - ExerSearch",
      body: "Hi ExerSearch Team,\n\nI need help with:\n\n",
    });
  }, [supportEmail]);

  const filteredFaqs = useMemo(() => {
    if (!searchIndex) {
      return activeCategory === "all" ? faqs : faqs.filter((f) => f.category === activeCategory);
    }
    return searchFaqs(searchQuery, faqs, searchIndex, activeCategory);
  }, [faqs, searchQuery, activeCategory, searchIndex]);

  const countFor = (id) => faqs.filter((f) => id === "all" || f.category === id).length;

  return (
    <>
      <Header />

      <div className={`fq ${heroIn ? "fq--in" : ""}`}>
        <section className="fq-banner">
          <div className="fq-banner__noise" />
          <div className="fq-banner__glow" />

          <div className="fq-wrap fq-banner__inner">
            <div className="fq-banner__left">
              <p className="fq-banner__eyebrow">Help Center</p>

              <h1 className="fq-banner__title">
                How can we
                <br />
                <em>help you?</em>
              </h1>

              <p className="fq-banner__sub">
                {faqs.length ? `${faqs.length}` : "—"} articles across {CATEGORIES.length - 1} topics.
              </p>
            </div>

            <div className="fq-banner__stats">
              {[
                ["50+", "Partner gyms"],
                ["24h", "Reply time"],
                ["100%", "Free forever"],
              ].map(([v, l]) => (
                <div key={l} className="fq-bstat">
                  <span className="fq-bstat__v">{v}</span>
                  <span className="fq-bstat__l">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="fq-wrap fq-body">
          <aside className="fq-sidebar">
            <div className="fq-sb-search">
              <Search size={14} className="fq-sb-search__ico" />

              <input
                ref={searchRef}
                className="fq-sb-search__input"
                type="text"
                placeholder="Search articles…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />

              {searchQuery && (
                <button
                  className="fq-sb-search__clear"
                  onClick={() => {
                    setSearchQuery("");
                    searchRef.current?.focus();
                  }}
                >
                  <X size={10} />
                </button>
              )}
            </div>

            {!searchQuery && (
              <div className="fq-sb-quick">
                {QUICK_SEARCHES.map((t, i) => (
                  <button key={i} className="fq-sb-chip" onClick={() => setSearchQuery(t)}>
                    {t}
                  </button>
                ))}
              </div>
            )}

            <p className="fq-sb-heading">Browse topics</p>

            <nav className="fq-sb-nav">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;

                return (
                  <button
                    key={cat.id}
                    className={`fq-sb-cat ${activeCategory === cat.id ? "fq-sb-cat--on" : ""}`}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    <span className="fq-sb-cat__ico">
                      <Icon size={13} />
                    </span>
                    <span className="fq-sb-cat__lbl">{cat.label}</span>
                    <span className="fq-sb-cat__n">{countFor(cat.id)}</span>
                  </button>
                );
              })}
            </nav>

            <div className="fq-sb-contact">
              <p className="fq-sb-contact__title">Still need help?</p>
              <p className="fq-sb-contact__sub">We reply within 24 hours.</p>

              <a href={gmailUrl} target="_blank" rel="noopener noreferrer" className="fq-sb-clink">
                <Mail size={13} />
                <span>{supportEmail}</span>
                <ArrowRight size={10} className="fq-sb-clink__arr" />
              </a>

              <a href={`tel:${contactPhone.replace(/\s+/g, "")}`} className="fq-sb-clink">
                <Phone size={13} />
                <span>{contactPhone}</span>
                <ArrowRight size={10} className="fq-sb-clink__arr" />
              </a>

              <div className="fq-sb-clink fq-sb-clink--soon">
                <MessageSquare size={13} />
                <span>Live chat — coming soon</span>
              </div>
            </div>
          </aside>

          <main className="fq-panel">
            <div className="fq-panel__bar">
              <span className="fq-panel__label">
                {loading ? (
                  "Loading…"
                ) : loadErr ? (
                  <span className="fq-panel__label--err">{loadErr}</span>
                ) : searchQuery ? (
                  <>
                    <CheckCircle2 size={12} className="fq-panel__check" />
                    <strong>{filteredFaqs.length}</strong>&nbsp;result
                    {filteredFaqs.length !== 1 ? "s" : ""}&nbsp;for&nbsp;
                    <em>"{searchQuery}"</em>
                  </>
                ) : (
                  <>
                    {CATEGORIES.find((c) => c.id === activeCategory)?.label}
                    <span className="fq-panel__count">{filteredFaqs.length}</span>
                  </>
                )}
              </span>

              {(searchQuery || activeCategory !== "all") && !loading && (
                <button
                  className="fq-panel__reset"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                  }}
                >
                  <X size={10} /> Reset
                </button>
              )}
            </div>

            {loading ? (
              <div className="fq-skeleton">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="fq-skeleton__item" style={{ "--si": i }} />
                ))}
              </div>
            ) : loadErr ? (
              <div className="fq-empty">
                <HelpCircle size={28} strokeWidth={1.2} />
                <h3>Couldn't load FAQs</h3>
                <p>{loadErr}</p>
                <button className="fq-empty__btn" onClick={() => window.location.reload()}>
                  Retry
                </button>
              </div>
            ) : filteredFaqs.length === 0 ? (
              <div className="fq-empty">
                <Search size={28} strokeWidth={1.2} />
                <h3>No results</h3>
                <p>Try different keywords or pick a broader topic.</p>
                <button
                  className="fq-empty__btn"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                  }}
                >
                  View all articles
                </button>
              </div>
            ) : (
              <div className="fq-list">
                {filteredFaqs.map((faq, i) => (
                  <FaqItem
                    key={faq.faq_id ?? i}
                    faq={faq}
                    index={i}
                    isOpen={activeFaq === i}
                    onToggle={() => setActiveFaq(activeFaq === i ? null : i)}
                    catMeta={CATEGORIES.find((c) => c.id === faq.category)}
                    gmailUrl={gmailUrl}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </>
  );
}