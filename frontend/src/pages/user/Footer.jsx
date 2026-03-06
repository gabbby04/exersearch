// src/components/footer/Footer.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Instagram,
  Facebook,
  Youtube,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import logo from "../../assets/exersearchlogo.png";
import "./HeaderFooter.css";

const API_BASE = "https://exersearch.test";

const COLS = [
  {
    heading: "Product",
    links: [
      { to: "/gyms", label: "Find Gyms" },
      { to: "/workouts", label: "Workout Plans" },
      { to: "/nutrition", label: "Meal Planner" },
      { to: "/tracker", label: "Progress Tracker" },
      { to: "/ai-bot", label: "AI Assistant" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { to: "/blog", label: "Blog" },
      { to: "/guides", label: "Fitness Guides" },
      { to: "/exercises", label: "Exercise Library" },
      { to: "/faqs", label: "FAQs" },
      { to: "/api", label: "API Docs" },
    ],
  },
  {
    heading: "Company",
    links: [
      { to: "/about", label: "About Us" },
      { to: "/careers", label: "Careers" },
      { to: "/press", label: "Press Kit" },
      { to: "/partners", label: "Partner Gyms" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { to: "/terms", label: "Terms of Service" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/cookies", label: "Cookie Policy" },
      { to: "/disclaimer", label: "Disclaimer" },
    ],
  },
];

const XIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2H21l-6.6 7.54L22 22h-6.828l-5.35-6.99L3.6 22H1l7.06-8.07L2 2h6.828l4.84 6.32L18.244 2z" />
  </svg>
);

function safeStr(v) {
  return v == null ? "" : String(v).trim();
}

function toAbsUrl(u) {
  if (!u) return "";
  const s = String(u).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const base = String(API_BASE || "").replace(/\/$/, "");
  const path = s.startsWith("/") ? s : `/${s}`;
  return `${base}${path}`;
}

function safeHref(url, fallback = "") {
  const s = safeStr(url);
  return s || fallback;
}

export default function Footer() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/settings/public`, {
          method: "GET",
          credentials: "include",
        });

        const json = await res.json();

        if (!mounted) return;
        setSettings(json?.data || null);
      } catch {
        if (!mounted) return;
        setSettings(null);
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const appName = safeStr(settings?.app_name) || "ExerSearch";

  // ✅ changed from logo_url to user_logo_url
  const logoSrc = toAbsUrl(settings?.user_logo_url) || logo;

  const contactPhone = safeStr(settings?.contact_phone) || "+63 123 456 7890";
  const contactEmail = safeStr(settings?.contact_email) || "hello@exersearch.com";
  const contactAddress = safeStr(settings?.address) || "Metro Manila, Philippines";

  const socials = useMemo(() => {
    const items = [
      {
        name: "Facebook",
        href: safeHref(settings?.facebook_url),
        icon: Facebook,
        color: "#1877F2",
      },
      {
        name: "Instagram",
        href: safeHref(settings?.instagram_url),
        icon: Instagram,
        color: "#E4405F",
      },
      {
        name: "Website",
        href: safeHref(settings?.website_url),
        icon: XIcon,
        color: "#000000",
      },
      {
        name: "YouTube",
        href: safeHref(settings?.youtube_url),
        icon: Youtube,
        color: "#FF0000",
      },
      {
        name: "Email",
        href: contactEmail ? `mailto:${contactEmail}` : "",
        icon: Mail,
        color: "#EA4335",
      },
    ];

    return items.filter((item) => safeStr(item.href));
  }, [settings, contactEmail]);

  return (
    <footer className="lnd-foot">
      <div className="lnd-foot__main">
        <div className="lnd-foot__top">
          <div className="lnd-foot__brand">
            <Link to="/">
              <img
                src={logoSrc}
                alt={appName}
                className="lnd-foot__logo"
                onError={(e) => {
                  e.currentTarget.src = logo;
                }}
              />
            </Link>

            <p className="lnd-foot__desc">
              Your AI-powered fitness companion. Find gyms, plan workouts, and achieve your goals.
            </p>

            <div className="lnd-foot__contact">
              <div className="lnd-foot__contact-item">
                <MapPin size={14} />
                <span>{contactAddress}</span>
              </div>

              <div className="lnd-foot__contact-item">
                <Phone size={14} />
                <span>{contactPhone}</span>
              </div>

              <div className="lnd-foot__contact-item">
                <Mail size={14} />
                <a href={`mailto:${contactEmail}`} className="lnd-foot__lnk">
                  {contactEmail}
                </a>
              </div>
            </div>
          </div>

          <div className="lnd-foot__links">
            {COLS.map(({ heading, links }) => (
              <div key={heading} className="lnd-foot__col">
                <p className="lnd-foot__col-head">{heading}</p>
                <ul>
                  {links.map(({ to, label }) => (
                    <li key={label}>
                      <Link to={to} className="lnd-foot__lnk">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="lnd-foot__bottom">
          <div className="lnd-foot__socials">
            <span className="lnd-foot__socials-label">Follow Us</span>

            <div className="lnd-foot__soc-grid">
              {socials.map(({ name, href, icon: Icon, color }) => (
                <a
                  key={name}
                  href={href}
                  className="lnd-foot__soc"
                  aria-label={name}
                  style={{ "--social-color": color }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon size={16} strokeWidth={2} />
                </a>
              ))}
            </div>
          </div>

          <div className="lnd-foot__legal">
            <span>© {new Date().getFullYear()} {appName}. All rights reserved.</span>
            <span className="lnd-foot__separator">•</span>
            <Link to="/terms">Terms</Link>
            <span className="lnd-foot__separator">•</span>
            <Link to="/privacy">Privacy</Link>
            <span className="lnd-foot__separator">•</span>
            <Link to="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}