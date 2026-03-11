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
import { api, RAW_API_BASE } from "../../utils/apiClient";

const COLS = [
  {
    heading: "Product",
    links: [
      { to: "/home/find-gyms", label: "Find Gyms" },
      { to: "/home/workout", label: "Workout Plans" },
      { to: "/home/meal-plan", label: "Meal Planner" },
      { to: "/home/memberships", label: "Membership" },
      { to: "/home/applyowner", label: "Gym Owner" },
    ],
  },
    {
      heading: "Resources",
      links: [
        { to: "/404", label: "Blog" },
        { to: "/404", label: "Fitness Guides" },
        { to: "https://www.youtube.com/@Exersearch", label: "Exercise Library" }, 
        { to: "/faqs", label: "FAQs" },
        { to: "/404", label: "API Docs" },
      ],
    },
  {
    heading: "Company",
    links: [
      { to: "/about-us", label: "About Us" },
      { to: "/philosophy", label: "Our Philosophy" },
      { to: "/how-it-works", label: "How it Works" },
      { to: "/why-exersearch", label: "Why ExerSearch" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { to: "https://www.termsfeed.com/live/a3cfb6d1-dcf3-46ce-8b98-5f0820525d76", label: "Terms" }, 
        { to: "/faqs", label: "FAQs" },
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

  const base = String(RAW_API_BASE || "").replace(/\/$/, "");
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
        const res = await api.get("/settings/public");

        if (!mounted) return;
        setSettings(res?.data?.data || null);
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
  const logoSrc = toAbsUrl(settings?.user_logo_url) || logo;
  const contactPhone = safeStr(settings?.contact_phone) || "+63 993 196 9111";
  const contactEmail = safeStr(settings?.contact_email) || "exersearch5@gmail.com";
  const contactAddress = safeStr(settings?.address) || "Pasig, Philippines";

const socials = [
  { name: "Facebook", href: "https://www.facebook.com/exersearch", icon: Facebook, color: "#1877F2" },
  { name: "Instagram", href: "https://www.instagram.com/exersearch?igsh=Z2ZqYXdyejVvY3lp", icon: Instagram, color: "#E4405F" },
  { name: "X (Twitter)", href: "https://x.com/exer_online5", icon: XIcon, color: "#000000" },
  { name: "YouTube", href: "https://www.youtube.com/@ExerSearch", icon: Youtube, color: "#FF0000" },
  { name: "Email", href: "https://mail.google.com/mail/?view=cm&fs=1&to=exersearch5@gmail.com", icon: Mail, color: "#EA4335" }
];



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
                  {...(name !== "Email" && { target: "_blank", rel: "noopener noreferrer" })} // ← Only add target="_blank" if NOT email
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