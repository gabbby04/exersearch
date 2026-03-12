import { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTheme } from "./ThemeContext";
import "./HeaderFooter.css";
import HeaderUser from "./Header-user";
import logoFull from "../../assets/exersearchlogo1.png";
import logoMobile from "../../assets/exersearchlogo.png";

const LEFT_LINKS = [
  { to: "/about-us", label: "About Us" },
  { to: "/why-exersearch", label: "Why Exersearch" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/reviews", label: "Reviews" },
];

const RIGHT_LINKS = [
  { to: "/contact", label: "Contact" },
  { to: "/faqs", label: "FAQs" },
  { to: "/philosophy", label: "Our Philosophy" },
];

export default function Header() {
  const { isDark } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  if (token) {
    return <HeaderUser />;
  }
  return (
    <>
      <header className={`lnd-bar ${isDark ? "lnd-bar--dark" : "lnd-bar--light"}`}>
        <div className="lnd-bar__inner">

          <nav className="lnd-nav lnd-nav--left">
            {LEFT_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `lnd-nav__item ${isActive ? "lnd-nav__item--active" : ""}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <Link to="/" className="lnd-wordmark" onClick={() => setMenuOpen(false)}>
            <div className="lnd-wordmark__wrap">
              <img src={logoFull} alt="ExerSearch" className="logo-full" />
              <img src={logoMobile} alt="ExerSearch" className="logo-mobile" />
            </div>
          </Link>

          <div className="lnd-right">
            <nav className="lnd-nav lnd-nav--right">
              {RIGHT_LINKS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `lnd-nav__item ${isActive ? "lnd-nav__item--active" : ""}`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="lnd-divider" />

            <div className="lnd-bar__ctas">
              <Link to="/login?mode=login" className="lnd-pill lnd-pill--ghost">
                Log in
              </Link>
              <Link to="/login?mode=signup" className="lnd-pill lnd-pill--solid">
                Get started
              </Link>
            </div>
          </div>

          <button
            className={`lnd-tog ${menuOpen ? "lnd-tog--x" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            type="button"
          >
            <span />
            <span />
            <span />
          </button>

        </div>
      </header>

      <div className={`lnd-sheet ${menuOpen ? "lnd-sheet--open" : ""}`}>
        <div className="lnd-sheet__body">

          <nav className="lnd-sheet__nav">
            {[...LEFT_LINKS, ...RIGHT_LINKS].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `lnd-sheet__row ${isActive ? "lnd-sheet__row--active" : ""}`
                }
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="lnd-sheet__btns">
            <Link
              to="/login?mode=login"
              className="lnd-pill lnd-pill--ghost lnd-pill--wide"
              onClick={() => setMenuOpen(false)}
            >
              Log in
            </Link>

            <Link
              to="/login?mode=signup"
              className="lnd-pill lnd-pill--solid lnd-pill--wide"
              onClick={() => setMenuOpen(false)}
            >
              Get started
            </Link>
          </div>

        </div>
      </div>

      {menuOpen && <div className="lnd-scrim" onClick={() => setMenuOpen(false)} />}
    </>
  );
}