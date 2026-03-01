import React, { useState } from "react";
import { Link } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import "./BecomeOwner.css";
import {
  FaArrowRight,
  FaCheckCircle,
  FaUsers,
  FaShieldAlt,
  FaCamera,
  FaMoneyBillWave,
  FaClipboardList,
  FaCrown,
  FaChevronDown,
} from "react-icons/fa";
import { MdDashboard } from "react-icons/md";

export default function BecomeOwner() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="bo-page">
    <Header />

      {/* ── HERO ── */}
      <section className="bo-hero">
        <div className="bo-hero-image-wrap">
          <img
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&h=900&fit=crop"
            alt="Gym"
            className="bo-hero-img"
          />
          <div className="bo-hero-overlay" />
        </div>
        <div className="bo-hero-content">
          <div className="bo-hero-badge">
            <FaCrown /> For Gym Owners
          </div>
          <h1 className="bo-hero-title">
            List your gym.<br />
            <span>Grow your business.</span>
          </h1>
          <p className="bo-hero-desc">
            Join ExerSearch as a verified gym owner and get discovered 
            by thousands of fitness-ready members in Pasig City.
          </p>
          <Link to="/home/applyowner" className="bo-hero-cta">
            Apply Now — It's Free <FaArrowRight />
          </Link>
        </div>
        <a href="#what-you-get" className="bo-scroll-hint">
          <FaChevronDown />
        </a>
      </section>

      {/* ── WHAT YOU GET ── */}
      <section className="bo-what" id="what-you-get">
        <div className="bo-what-label">What you get</div>
        <div className="bo-what-grid">

          <div className="bo-what-item bo-what-featured">
            <div className="bo-what-num">01</div>
            <MdDashboard className="bo-what-icon" />
            <h3>Your Own Owner Dashboard</h3>
            <p>
              Manage your gym profile, photos, pricing, hours, and amenities 
              all from one place. Built specifically for gym owners.
            </p>
          </div>

          <div className="bo-what-item">
            <div className="bo-what-num">02</div>
            <FaUsers className="bo-what-icon" />
            <h3>Reach 1,000+ Active Users</h3>
            <p>
              People on ExerSearch are actively looking for gyms to join. 
              Your listing puts you right in front of them.
            </p>
          </div>

          <div className="bo-what-item">
            <div className="bo-what-num">03</div>
            <FaShieldAlt className="bo-what-icon" />
            <h3>Verified Gym Badge</h3>
            <p>
              Earn a verified badge that builds trust with potential 
              members and sets you apart from unverified listings.
            </p>
          </div>

          <div className="bo-what-item bo-what-accent">
            <div className="bo-what-num">04</div>
            <FaMoneyBillWave className="bo-what-icon" />
            <h3>Completely Free</h3>
            <p>
              No listing fees. No monthly charges. No commissions. 
              Listing your gym on ExerSearch costs nothing.
            </p>
          </div>

        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="bo-how">
        <div className="bo-how-inner">
          <div className="bo-how-header">
            <span className="bo-how-label">The process</span>
            <h2 className="bo-how-title">Two approvals.<br />Fully live in days.</h2>
          </div>

          <div className="bo-how-steps">

            <div className="bo-how-step">
              <div className="bo-how-step-left">
                <div className="bo-how-step-num">1</div>
                <div className="bo-how-step-line" />
              </div>
              <div className="bo-how-step-right">
                <h3>Create an ExerSearch account</h3>
                <p>
                  You need to be a registered user first. Already have one? 
                  Skip straight to step 2.{" "}
                  <Link to="/register" className="bo-inline-link">
                    Sign up here →
                  </Link>
                </p>
              </div>
            </div>

            <div className="bo-how-step">
              <div className="bo-how-step-left">
                <div className="bo-how-step-num">2</div>
                <div className="bo-how-step-line" />
              </div>
              <div className="bo-how-step-right">
                <div className="bo-step-tag">Owner Approval</div>
                <h3>Apply as a gym owner</h3>
                <p>
                  Submit a short owner application with your name, contact, 
                  business name, and registration document. Takes less than 
                  5 minutes.
                </p>
              </div>
            </div>

            <div className="bo-how-step">
              <div className="bo-how-step-left">
                <div className="bo-how-step-num">3</div>
                <div className="bo-how-step-line" />
              </div>
              <div className="bo-how-step-right">
                <div className="bo-step-tag">Owner Approval</div>
                <h3>Admin reviews your application</h3>
                <p>
                  Our team verifies your identity and business within{" "}
                  <strong>1–3 business days</strong>. Once approved, your 
                  account is upgraded to Owner.
                </p>
              </div>
            </div>

            <div className="bo-how-step">
              <div className="bo-how-step-left">
                <div className="bo-how-step-num">4</div>
                <div className="bo-how-step-line" />
              </div>
              <div className="bo-how-step-right">
                <div className="bo-step-tag bo-step-tag-gym">Gym Approval</div>
                <h3>Submit your gym for listing</h3>
                <p>
                  From your owner dashboard, add your gym — location, photos, 
                  pricing, amenities, and operating hours. Then submit it for 
                  admin review.
                </p>
              </div>
            </div>

            <div className="bo-how-step bo-how-step-last">
              <div className="bo-how-step-left">
                <div className="bo-how-step-num">5</div>
              </div>
              <div className="bo-how-step-right">
                <div className="bo-step-tag bo-step-tag-gym">Gym Approval</div>
                <h3>Your gym goes live</h3>
                <p>
                  Once your gym is approved, it's discoverable to all 
                  ExerSearch users. Start getting found by members looking 
                  for exactly what you offer.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Image accent */}
        <div className="bo-how-image-wrap">
          <img
            src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&h=1000&fit=crop"
            alt="Gym interior"
            className="bo-how-image"
          />
          <div className="bo-how-image-tag">
            <strong>1–3 days</strong>
            <span>Average approval time</span>
          </div>
        </div>
      </section>

      {/* ── REQUIREMENTS ── */}
      <section className="bo-reqs">
        <div className="bo-reqs-inner">
          <span className="bo-reqs-label">Requirements</span>
          <h2 className="bo-reqs-title">
            Simple docs.<br />Fast approval.
          </h2>
          <p className="bo-reqs-desc">
            Here's everything you need to have ready before submitting 
            your application.
          </p>

          <div className="bo-reqs-list">
            <div className="bo-req-item">
              <FaCheckCircle className="bo-req-check" />
              <div>
                <h4>ExerSearch user account</h4>
                <p>Must be registered and verified on the platform.</p>
              </div>
            </div>
            <div className="bo-req-item">
              <FaCheckCircle className="bo-req-check" />
              <div>
                <h4>Full name & contact details</h4>
                <p>Your name, email, and phone number.</p>
              </div>
            </div>
            <div className="bo-req-item">
              <FaCheckCircle className="bo-req-check" />
              <div>
                <h4>Business name & description</h4>
                <p>A short description of your gym and what it offers.</p>
              </div>
            </div>
            <div className="bo-req-item">
              <FaCheckCircle className="bo-req-check" />
              <div>
                <h4>Business registration document</h4>
                <p>DTI, SEC registration, or barangay business permit.</p>
              </div>
            </div>
            <div className="bo-req-item">
              <FaCheckCircle className="bo-req-check" />
              <div>
                <h4>Gym photos</h4>
                <p>At least 2–3 real photos of your gym and equipment.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bo-faq">
        <div className="bo-faq-inner">
          <span className="bo-faq-label">FAQ</span>
          <h2 className="bo-faq-title">Common questions</h2>

          {[
            {
              q: "Do I need an account before applying?",
              a: "Yes. You need a registered ExerSearch account to apply. This keeps the platform trustworthy and lets you track your application status.",
            },
            {
              q: "How long does approval take?",
              a: "Our admin team reviews applications within 1–3 business days. You'll get an email once it's been approved or if we need more info.",
            },
            {
              q: "Can I list more than one gym?",
              a: "Yes! Once you're an approved owner, you can list as many gyms as you own. Each gym goes through its own approval.",
            },
            {
              q: "Is there any cost involved?",
              a: "None. Listing your gym on ExerSearch is completely free — no setup fee, no monthly fee, no commission.",
            },
          ].map((faq, i) => (
            <div
              key={i}
              className={`bo-faq-item ${openFaq === i ? "open" : ""}`}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div className="bo-faq-q">
                <span>{faq.q}</span>
                <div className="bo-faq-toggle">{openFaq === i ? "−" : "+"}</div>
              </div>
              <div className="bo-faq-a">
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bo-cta">
        <div className="bo-cta-inner">
          <h2>Your gym deserves<br />to be found.</h2>
          <p>Apply as a verified gym owner on ExerSearch — free, fast, and built for business.</p>
          <div className="bo-cta-btns">
            <Link to="/owner-application" className="bo-cta-primary">
              Apply as Gym Owner <FaArrowRight />
            </Link>
            <Link to="/register" className="bo-cta-secondary">
              Create an Account First
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}