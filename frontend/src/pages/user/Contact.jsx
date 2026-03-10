import { useRef, useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import "./Contact.css";
import emailjs from "@emailjs/browser";
import {
  ArrowUpRight,
  Mail,
  Instagram,
  Send,
  MessageSquare,
  Users,
  Dumbbell,
} from "lucide-react";

import ScrollThemeWidget from "../../utils/ScrollThemeWidget";
/* EMAILJS ENV */
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

const LINKS = [
  { label: "Instagram", href: "#", icon: Instagram },
  { label: "Email us", href: "mailto:exersearch5@gmail.com", icon: Mail },
];

const WHO_FOR = [
  {
    icon: Users,
    label: "Users",
    desc: "Questions about your plan, account, or progress.",
  },
  {
    icon: Dumbbell,
    label: "Gym owners",
    desc: "Interested in listing your gym on ExerSearch.",
  },
  {
    icon: MessageSquare,
    label: "Everyone else",
    desc: "Press, feedback, collabs, or just saying hi.",
  },
];

const REASONS = [
  "General inquiry",
  "Gym partnership",
  "Press & media",
  "Bug report",
  "Careers",
  "Other",
];

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    reason: "",
    message: "",
  });

  const [focused, setFocused] = useState(null);
  const [sent, setSent] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const formRef = useRef(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.message) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setSending(true);
      setError("");

      await emailjs.send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          from_name: form.name,
          from_email: form.email,
          reason: form.reason || "General inquiry",
          message: form.message,
        },
        PUBLIC_KEY
      );

      setSent(true);
    } catch (err) {
      console.error("EmailJS error:", err);
      setError("Message failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Header />

      <div className="ct">
        <section className="ct-split">
          {/* LEFT SIDE */}
          <div className="ct-split__left">
            <div className="ct-split__noise" />
            <div className="ct-split__grain" />

            <div className="ct-split__content">
              <p className="ct-overline">Contact</p>

              <h1 className="ct-title">
                Let's talk
                <br />
                about
                <br />
                <em>what you need.</em>
              </h1>

              <p className="ct-left__body">
                Whether you're a user, a gym owner, or just curious — this is
                the right place. Drop us a message and we'll get back to you.
              </p>

              <div className="ct-who">
                {WHO_FOR.map((w, i) => {
                  const Icon = w.icon;
                  return (
                    <div
                      key={i}
                      className="ct-who__item"
                      style={{ "--di": i }}
                    >
                      <div className="ct-who__ico">
                        <Icon size={14} />
                      </div>

                      <div>
                        <span className="ct-who__label">{w.label}</span>
                        <span className="ct-who__desc">{w.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="ct-links">
                {LINKS.map((l, i) => {
                  const Icon = l.icon;

                  return (
                    <a key={i} href={l.href} className="ct-link">
                      <Icon size={13} />
                      <span>{l.label}</span>
                      <ArrowUpRight size={11} className="ct-link__arrow" />
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="ct-split__deco" aria-hidden>
              GET
              <br />
              IN
              <br />
              TOUCH
            </div>
          </div>

          {/* RIGHT SIDE FORM */}
          <div className="ct-split__right">
            <div className="ct-form-wrap">
              {!sent ? (
                <form
                  className="ct-form"
                  onSubmit={handleSubmit}
                  ref={formRef}
                >
                  <div className="ct-form__head">
                    <h2 className="ct-form__title">Send a message</h2>
                    <p className="ct-form__sub">
                      Fill in the fields below and we'll get back to you.
                    </p>
                  </div>

                  {/* NAME */}
                  <div
                    className={`ct-field ${
                      focused === "name" ? "ct-field--focus" : ""
                    } ${form.name ? "ct-field--filled" : ""}`}
                  >
                    <label className="ct-field__label">Your name</label>

                    <input
                      className="ct-field__input"
                      type="text"
                      placeholder="Full name"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      onFocus={() => setFocused("name")}
                      onBlur={() => setFocused(null)}
                    />

                    <div className="ct-field__line" />
                  </div>

                  {/* EMAIL */}
                  <div
                    className={`ct-field ${
                      focused === "email" ? "ct-field--focus" : ""
                    } ${form.email ? "ct-field--filled" : ""}`}
                  >
                    <label className="ct-field__label">Email address</label>

                    <input
                      className="ct-field__input"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                    />

                    <div className="ct-field__line" />
                  </div>

                  {/* REASON */}
                  <div
                    className={`ct-field ${
                      focused === "reason" ? "ct-field--focus" : ""
                    } ${form.reason ? "ct-field--filled" : ""}`}
                  >
                    <label className="ct-field__label">
                      Reason for reaching out
                    </label>

                    <div className="ct-chips">
                      {REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          className={`ct-chip ${
                            form.reason === r ? "ct-chip--on" : ""
                          }`}
                          onClick={() =>
                            set("reason", form.reason === r ? "" : r)
                          }
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    <div className="ct-field__line" />
                  </div>

                  {/* MESSAGE */}
                  <div
                    className={`ct-field ct-field--tall ${
                      focused === "msg" ? "ct-field--focus" : ""
                    } ${form.message ? "ct-field--filled" : ""}`}
                  >
                    <label className="ct-field__label">Your message</label>

                    <textarea
                      className="ct-field__input ct-field__textarea"
                      rows={5}
                      placeholder="Tell us what's on your mind..."
                      value={form.message}
                      onChange={(e) => {
                        const value = e.target.value.slice(0, 1000);
                        set("message", value);
                        setCharCount(value.length);
                      }}
                      onFocus={() => setFocused("msg")}
                      onBlur={() => setFocused(null)}
                    />

                    <div className="ct-field__line" />
                    <span className="ct-char-count">
                      {charCount} / 1000
                    </span>
                  </div>

                  {error && <p className="ct-form__error">{error}</p>}

                  <button
                    type="submit"
                    className="ct-submit"
                    disabled={sending}
                  >
                    <span>{sending ? "Sending..." : "Send message"}</span>
                    <Send size={15} />
                  </button>

                  <p className="ct-form__legal">
                    No spam. Your info is used only to respond to your
                    inquiry.
                  </p>
                </form>
              ) : (
                <div className="ct-success">
                  <div className="ct-success__mark">✓</div>

                  <h2 className="ct-success__title">Message received.</h2>

                  <p className="ct-success__body">
                    We've got your note,{" "}
                    {form.name.split(" ")[0]}. Expect a reply at{" "}
                    <strong>{form.email}</strong>.
                  </p>

                  <button
                    className="ct-success__reset"
                    onClick={() => {
                      setSent(false);
                      setForm({
                        name: "",
                        email: "",
                        reason: "",
                        message: "",
                      });
                      setCharCount(0);
                    }}
                  >
                    Send another
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <Footer />
      <ScrollThemeWidget/>
    </>
  );
}