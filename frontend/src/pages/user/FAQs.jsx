import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

import Footer from "./Footer";
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
  Headphones,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import "./FAQs.css";

const API_BASE = "https://exersearch.test";

function safeStr(v) {
  return v == null ? "" : String(v);
}

function toId(label) {
  return safeStr(label).trim().toLowerCase();
}

async function fetchFaqsAllActive() {
  const fetchPage = async (page) => {
    const res = await axios.get(`${API_BASE}/api/v1/faqs`, {
      withCredentials: true,
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
    for (let p = 2; p <= lastPage; p++) promises.push(fetchPage(p));
    const rest = await Promise.all(promises);
    for (const r of rest) {
      const pag = r?.data || r;
      const arr = Array.isArray(pag?.data) ? pag.data : [];
      merged.push(...arr);
    }
  }

  return merged.filter((r) => !!r.is_active);
}

export default function FAQsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeFaq, setActiveFaq] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [faqs, setFaqs] = useState([]);

  const categories = useMemo(
    () => [
      { id: "all", label: "All Topics", icon: <HelpCircle size={14} /> },
      { id: "account", label: "Account", icon: <User size={14} /> },
      { id: "gyms", label: "Gyms", icon: <Dumbbell size={14} /> },
      { id: "workouts", label: "Workouts", icon: <Rocket size={14} /> },
      { id: "nutrition", label: "Nutrition", icon: <UtensilsCrossed size={14} /> },
      { id: "billing", label: "Billing", icon: <CreditCard size={14} /> },
      { id: "privacy", label: "Privacy", icon: <ShieldCheck size={14} /> },
      { id: "technical", label: "Technical", icon: <Smartphone size={14} /> },
    ],
    []
  );

  const categoryIdByLabel = useMemo(() => {
    const m = new Map();
    for (const c of categories) m.set(toId(c.label), c.id);
    return m;
  }, [categories]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setLoadErr("");
      try {
        const rows = await fetchFaqsAllActive();

        const mapped = rows
          .map((r) => {
            const label = toId(r.category);
            const id = categoryIdByLabel.get(label) || "all";
            return {
              faq_id: r.faq_id,
              category: id,
              category_label: safeStr(r.category) || "",
              display_order: Number.isFinite(Number(r.display_order)) ? Number(r.display_order) : 0,
              question: safeStr(r.question),
              answer: safeStr(r.answer),
            };
          })
          .sort((a, b) => {
            const ao = a.display_order - b.display_order;
            if (ao !== 0) return ao;
            return a.faq_id - b.faq_id;
          });

        if (!alive) return;
        setFaqs(mapped);
      } catch (e) {
        if (!alive) return;
        setFaqs([]);
        setLoadErr(e?.response?.data?.message || e?.message || "Failed to load FAQs.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [categoryIdByLabel]);

  const contactOptions = useMemo(
    () => [
      { icon: <Mail size={22} />, title: "Email Us", detail: "support@exersearch.com", description: "We reply within 24 hours" },
      { icon: <Phone size={22} />, title: "Call Us", detail: "+63 917 123 4567", description: "Mon – Fri · 9AM – 6PM" },
      { icon: <MessageSquare size={22} />, title: "Live Chat", detail: "Available Now", description: "Instant help from the team" },
    ],
    []
  );

  const calculateSimilarity = (s1, s2) => {
    const a = s1.length > s2.length ? s1 : s2;
    const b = s1.length > s2.length ? s2 : s1;
    if (!a.length) return 1;
    return (a.length - levenshteinDistance(a, b)) / a.length;
  };

  const levenshteinDistance = (s1, s2) => {
    const m = [];
    for (let i = 0; i <= s2.length; i++) m[i] = [i];
    for (let j = 0; j <= s1.length; j++) m[0][j] = j;
    for (let i = 1; i <= s2.length; i++)
      for (let j = 1; j <= s1.length; j++)
        m[i][j] =
          s2[i - 1] === s1[j - 1]
            ? m[i - 1][j - 1]
            : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    return m[s2.length][s1.length];
  };

  const searchFaqs = (query) => {
    if (!query.trim()) return faqs;
    const terms = query.toLowerCase().split(" ").filter((t) => t.length > 2);

    return faqs
      .map((faq) => {
        let score = 0;
        const q = faq.question.toLowerCase();
        const a = faq.answer.toLowerCase();
        const c =
          categories.find((x) => x.id === faq.category)?.label.toLowerCase() || "";

        terms.forEach((t) => {
          if (q.includes(t)) score += 10;
          if (a.includes(t)) score += 5;
          if (c.includes(t)) score += 3;
          q.split(" ").forEach((w) => {
            if (w.startsWith(t)) score += 7;
          });
          a.split(" ").forEach((w) => {
            if (w.startsWith(t)) score += 3;
          });
          q.split(" ").forEach((w) => {
            if (w.length > 3 && t.length > 3 && calculateSimilarity(w, t) > 0.7) score += 5;
          });
        });

        return { ...faq, relevanceScore: score };
      })
      .filter((f) => f.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  };

  const filteredFaqs = useMemo(() => {
    const base = searchQuery.trim()
      ? searchFaqs(searchQuery)
      : faqs;

    return base.filter((f) => activeCategory === "all" || f.category === activeCategory);
  }, [faqs, searchQuery, activeCategory]);

  useEffect(() => {
    setActiveFaq(null);
  }, [activeCategory, searchQuery]);

  const toggleFaq = (i) => setActiveFaq(activeFaq === i ? null : i);

  return (
    <div className="fq">
      <section className="fq-hero">
        <div className="fq-hero__glow" />
        <div className="fq-wrap">
          <div className="fq-hero__content">
            <p className="fq-hero__eyebrow">
              <HelpCircle size={12} strokeWidth={2.5} />
              Frequently Asked Questions
            </p>
            <h1 className="fq-hero__title">
              Got questions?<br />
              <span>We have answers.</span>
            </h1>
            <p className="fq-hero__sub">
              Everything you need to know about ExerSearch —<br />
              from gym discovery to nutrition planning.
            </p>

            <div className="fq-searchbar">
              <Search className="fq-searchbar__ico" size={16} strokeWidth={2.5} />
              <input
                type="text"
                className="fq-searchbar__input"
                placeholder='Search articles — try "gym reviews" or "meal plan"'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="fq-searchbar__clear" onClick={() => setSearchQuery("")}>
                  ✕
                </button>
              )}
            </div>

            {!searchQuery && (
              <div className="fq-popular">
                <span>Quick searches —</span>
                {["create account", "gym reviews", "meal planner", "always free"].map((t, i) => (
                  <button key={i} className="fq-popular__chip" onClick={() => setSearchQuery(t)}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="fq-hero__stats">
            {[
              [`${faqs.length}+`, "Help Articles"],
              ["50+", "Partner Gyms"],
              ["24h", "Avg. Response"],
              ["100%", "Free Platform"],
            ].map(([v, l]) => (
              <div key={l} className="fq-hero__stat">
                <span className="fq-hero__stat-n">{v}</span>
                <span className="fq-hero__stat-l">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fq-main">
        <div className="fq-wrap fq-main__grid">
          <aside className="fq-sidebar">
            <p className="fq-sidebar__heading">Browse by Topic</p>
            <nav>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`fq-catbtn ${activeCategory === cat.id ? "fq-catbtn--on" : ""}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <span className="fq-catbtn__ico">{cat.icon}</span>
                  <span className="fq-catbtn__lbl">{cat.label}</span>
                  <span className="fq-catbtn__n">
                    {faqs.filter((f) => cat.id === "all" || f.category === cat.id).length}
                  </span>
                </button>
              ))}
            </nav>

            <div className="fq-sidebar__help">
              <p>Didn't find your answer?</p>
              <Link to="/contact" className="fq-sidebar__cta">
                <Headphones size={14} />
                Contact Support
              </Link>
            </div>
          </aside>

          <div className="fq-panel">
            <div className="fq-panel__hdr">
              {loading ? (
                <>
                  <h2 className="fq-panel__title">Loading…</h2>
                  <p className="fq-panel__meta">Fetching FAQs</p>
                </>
              ) : loadErr ? (
                <>
                  <h2 className="fq-panel__title">FAQs</h2>
                  <p className="fq-panel__meta">
                    {loadErr}{" "}
                    <button
                      className="fq-popular__chip"
                      onClick={() => window.location.reload()}
                      style={{ marginLeft: 10 }}
                    >
                      Retry
                    </button>
                  </p>
                </>
              ) : searchQuery ? (
                <>
                  <h2 className="fq-panel__title">Search Results</h2>
                  <p className="fq-panel__meta">
                    <CheckCircle2 size={13} className="fq-panel__check" />
                    <strong>{filteredFaqs.length}</strong>&nbsp;
                    result{filteredFaqs.length !== 1 ? "s" : ""} for&nbsp;
                    <em>"{searchQuery}"</em>
                  </p>
                </>
              ) : (
                <>
                  <h2 className="fq-panel__title">
                    {categories.find((c) => c.id === activeCategory)?.label}
                  </h2>
                  <p className="fq-panel__meta">
                    {filteredFaqs.length}&nbsp;article{filteredFaqs.length !== 1 ? "s" : ""}
                  </p>
                </>
              )}
            </div>

            {!loading && !loadErr && filteredFaqs.length > 0 ? (
              <ul className="fq-list">
                {filteredFaqs.map((faq, i) => {
                  const open = activeFaq === i;
                  const catMeta = categories.find((c) => c.id === faq.category);
                  return (
                    <li
                      key={faq.faq_id ?? i}
                      className={`fq-item ${open ? "fq-item--open" : ""}`}
                      style={{ "--delay": `${i * 0.035}s` }}
                      onClick={() => toggleFaq(i)}
                    >
                      <div className="fq-item__head">
                        <div className="fq-item__ico">{catMeta?.icon}</div>
                        <div className="fq-item__mid">
                          <p className="fq-item__q">{faq.question}</p>
                          <span className="fq-item__tag">{catMeta?.label}</span>
                        </div>
                        <ChevronDown
                          size={15}
                          strokeWidth={2.5}
                          className={`fq-item__chevron ${open ? "fq-item__chevron--open" : ""}`}
                        />
                      </div>

                      <div className={`fq-item__body ${open ? "fq-item__body--open" : ""}`}>
                        <p className="fq-item__ans">{faq.answer}</p>
                        <div className="fq-item__foot">
                          <span>Helpful?</span>
                          <button
                            className="fq-helpful fq-helpful--yes"
                            onClick={(e) => e.stopPropagation()}
                            title="Yes, this helped"
                          >
                            <ThumbsUp size={13} strokeWidth={2} />
                            <span>Yes</span>
                          </button>
                          <button
                            className="fq-helpful fq-helpful--no"
                            onClick={(e) => e.stopPropagation()}
                            title="No, not helpful"
                          >
                            <ThumbsDown size={13} strokeWidth={2} />
                            <span>No</span>
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : loading ? (
              <div className="fq-empty">
                <div className="fq-empty__ico">
                  <HelpCircle size={28} strokeWidth={1.5} />
                </div>
                <h3>Loading…</h3>
                <p>Please wait</p>
              </div>
            ) : loadErr ? (
              <div className="fq-empty">
                <div className="fq-empty__ico">
                  <HelpCircle size={28} strokeWidth={1.5} />
                </div>
                <h3>Couldn't load FAQs</h3>
                <p>{loadErr}</p>
                <button
                  className="fq-empty__btn"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="fq-empty">
                <div className="fq-empty__ico">
                  <HelpCircle size={28} strokeWidth={1.5} />
                </div>
                <h3>No results found</h3>
                <p>Try different keywords or browse a topic from the sidebar</p>
                <button
                  className="fq-empty__btn"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                  }}
                >
                  View All Articles
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="fq-contact">
        <div className="fq-wrap">
          <div className="fq-contact__hdr">
            <p className="fq-contact__eyebrow">Support</p>
            <h2 className="fq-contact__title">
              Still need <em>help?</em>
            </h2>
            <p className="fq-contact__sub">
              Our support team is standing by — reach us any way you prefer.
            </p>
          </div>

          <div className="fq-contact__grid">
            {contactOptions.map((o, i) => (
              <div key={i} className="fq-ccard">
                <div className="fq-ccard__ico">{o.icon}</div>
                <h3 className="fq-ccard__title">{o.title}</h3>
                <p className="fq-ccard__detail">{o.detail}</p>
                <p className="fq-ccard__desc">{o.description}</p>
                <button className="fq-ccard__btn">Get in Touch</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fq-cta">
        <div className="fq-wrap fq-cta__inner">
          <div>
            <h2 className="fq-cta__title">
              Can't find <em>what you're looking for?</em>
            </h2>
            <p className="fq-cta__sub">
              Send us a message — we'll get back to you within 24 hours.
            </p>
          </div>
          <Link to="/contact" className="fq-cta__btn">
            <Mail size={15} strokeWidth={2.5} />
            Contact Support
          </Link>
        </div>
      </section>

    </div>
  );
}