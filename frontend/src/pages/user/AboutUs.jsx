import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { ArrowRight, Linkedin, Github, Mail, Facebook, Instagram } from 'lucide-react';
import './AboutUs.css';
import ScrollThemeWidget from '../../utils/ScrollThemeWidget';

/* ─── DATA ─── */
const TEAM = [
  {
    id: 1,
    name: 'Dheniel Pontiga',
    role: 'Lead Developer',
    quote: 'Great systems aren’t built overnight — they’re engineered one problem at a time.',
    image: '5.png',
    socials: { github: 'https://github.com/Phayce04', linkedin: 'https://www.linkedin.com/in/dheniel-pontiga-280024343/', email: 'dhenielpontiga@gmail.com' },
  },
  {
    id: 2,
    name: 'Ahron Javier',
    role: 'Frontend Developer',
    quote: 'Good design isn’t just what you see — it’s how smoothly everything works.',
    image: '4.png',
    socials: { github: 'https://github.com/gabbby04', linkedin: 'https://www.linkedin.com/in/ahron-javier-638082345/', email: 'ahronjavier16@gmail.com' },
  },
  {
    id: 3,
    name: 'Jedelyn Alayahay',
    role: 'UI Design & Media Editor',
    quote: 'Creativity turns ideas into experiences people remember.',
    image: '1.png',
    socials: { facebook: '#', instagram: '#', email: '#' },
  },
  {
    id: 4,
    name: 'Janmarco Candido',
    role: 'Project Manager & Documentation Lead',
    quote: 'A strong vision and teamwork turn projects into reality.',
    image: '3.png',
    socials: { facebook: '#', instagram: '#', email: '#' },
  },
  {
    id: 5,
    name: 'Mark Lawrence Hael',
    role: 'Technical Support & Data Assistant',
    quote: 'The small details behind the scenes are what keep everything running.',
    image: '2.png',
    socials: { facebook: 'https://www.facebook.com/share/1DUoLHHDHw/', instagram: 'https://www.instagram.com/_koyskie?igsh=NzNtYndmeXA0MWs3&fbclid=IwY2xjawQc7wZleHRuA2FlbQIxMQBzcnRjBmFwcF9pZAEwAAEe4xgzM0VorLtt2AVVLBgLc7299E7ot4wKi1xjfF60g7j5DYe-78m2JVKtnPw_aem_t5pyfTcEquTsykBdszOPww', email: 'hael.marklawrence@gmail.com' },
  },
];

const STATS = [
  { val: '1,000+', label: 'Active users' },
  { val: '50+',    label: 'Partner gyms' },
  { val: '5,000+', label: 'Workouts logged' },
  { val: '4.9',    label: 'Avg rating' },
];

const MANIFESTO = [
  { n: '01', head: 'Always free.',       body: 'No paywalls. No premium tiers. Gyms pay us so you never have to.' },
  { n: '02', head: 'Radically honest.',  body: 'Real reviews from verified users only. Zero tolerance for fakes.' },
  { n: '03', head: 'User-centered.',     body: 'Every feature starts with research. You drive our roadmap.' },
  { n: '04', head: 'Filipino first.',    body: 'Built for local culture, local budgets, local fitness habits.' },
];

/* ─── TEAM CARD ─── */
function TeamCard({ member, index }) {
  const [flipped, setFlipped] = useState(false);
  const [vis, setVis] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`ab-card ${flipped ? 'ab-card--flip' : ''} ${vis ? 'ab-card--in' : ''}`}
      style={{ '--di': index }}
      onClick={() => setFlipped(f => !f)}
    >
      <div className="ab-card__inner">
        {/* FRONT */}
        <div className="ab-card__face ab-card__face--front">
          <div className="ab-card__img-wrap">
            <img src={member.image} alt={member.name} className="ab-card__img" />
            <div className="ab-card__img-overlay" />
          </div>
          <div className="ab-card__front-info">
            <span className="ab-card__num">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <p className="ab-card__name">{member.name}</p>
              <p className="ab-card__role">{member.role}</p>
            </div>
          </div>
          <span className="ab-card__flip-hint">Tap to read →</span>
        </div>
        {/* BACK */}
        <div className="ab-card__face ab-card__face--back">
          <span className="ab-card__num ab-card__num--back">{String(index + 1).padStart(2, '0')}</span>
          <p className="ab-card__name ab-card__name--back">{member.name}</p>
          <p className="ab-card__role ab-card__role--back">{member.role}</p>
          <blockquote className="ab-card__quote">"{member.quote}"</blockquote>
          <div className="ab-card__socials">
            {member.socials.github   && <a href={member.socials.github}   onClick={e => e.stopPropagation()}><Github   size={14} /></a>}
            {member.socials.linkedin && <a href={member.socials.linkedin} onClick={e => e.stopPropagation()}><Linkedin size={14} /></a>}
            {member.socials.facebook && <a href={member.socials.facebook} onClick={e => e.stopPropagation()}><Facebook size={14} /></a>}
            {member.socials.instagram && <a href={member.socials.instagram} onClick={e => e.stopPropagation()}><Instagram size={14} /></a>}
            <a href={`mailto:${member.socials.email}`} onClick={e => e.stopPropagation()}><Mail size={14} /></a>
          </div>
          <span className="ab-card__flip-hint ab-card__flip-hint--back">← Back</span>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN ─── */
export default function AboutUs() {
  const [heroIn, setHeroIn] = useState(false);
  const manifestoRef = useRef(null);
  const [manifestoVis, setManifestoVis] = useState(false);
  const statsRef = useRef(null);
  const [statsVis, setStatsVis] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroIn(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setManifestoVis(true); }, { threshold: 0.1 });
    if (manifestoRef.current) obs.observe(manifestoRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVis(true); }, { threshold: 0.1 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <Header />
      <div className="ab">

        {/* ══ HERO ══ */}
        <section className={`ab-hero ${heroIn ? 'ab-hero--in' : ''}`}>
          <div className="ab-hero__bg">
            <div className="ab-hero__grid" />
            <div className="ab-hero__orb" />
          </div>

          <div className="ab-hero__layout">
            {/* left col */}
            <div className="ab-hero__left">
              <span className="ab-eyebrow">About ExerSearch</span>
              <h1 className="ab-hero__headline">
                <span className="ab-hero__line ab-hero__line--1">We</span>
                <span className="ab-hero__line ab-hero__line--2">fix<em>ed</em></span>
                <span className="ab-hero__line ab-hero__line--3">fitness.</span>
              </h1>
              <p className="ab-hero__sub">
                Five people. One city. A platform built out of genuine frustration with how hard it was to find a gym, stay consistent, and actually make progress in Pasig.
              </p>
              <Link to="/login?mode=signup"className="ab-hero__cta">
                Start for free <ArrowRight size={15} />
              </Link>
            </div>

            {/* right col — stat strip */}
            <div className="ab-hero__right">
              {STATS.map((s, i) => (
                <div key={i} className="ab-hero__stat" style={{ '--si': i }}>
                  <span className="ab-hero__stat-val">{s.val}</span>
                  <span className="ab-hero__stat-lbl">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* big ghost text */}
          <div className="ab-hero__ghost" aria-hidden>EXERSEARCH</div>
        </section>

        {/* ══ ORIGIN STORY ══ */}
        <section className="ab-story">
          <div className="ab-story__wrap">
            <div className="ab-story__label">
              <span>Our story</span>
              <div className="ab-story__label-line" />
            </div>

            <div className="ab-story__body">
              <div className="ab-story__pull">
                <span className="ab-story__pull-quote">
                  "The gym search experience in Pasig was broken."
                </span>
              </div>
              <div className="ab-story__text">
                <p>It started with a simple problem. Our founder spent three weeks visiting gyms across Pasig — dealing with fake photos, hidden prices, and reviews that all sounded suspiciously perfect. After finally picking one, he realised he wasn't alone in that struggle.</p>
                <p>So we built the platform we wished existed. Real member photos. Verified reviews. Transparent pricing. An AI that builds your plan around your life — not a generic template. And a way to actually find a gym that fits before you commit.</p>
                <p>We're a thesis project, but we're building it like a real product. Because the problem is real, and the people dealing with it deserve something that actually works.</p>
                <div className="ab-story__sig">
                  <span>— Janmarco Candido, Founder</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ MANIFESTO / VALUES ══ */}
        <section className="ab-manifesto" ref={manifestoRef}>
          <div className="ab-manifesto__wrap">
            <div className="ab-manifesto__hdr">
              <span className="ab-eyebrow ab-eyebrow--dk">What we stand for</span>
              <h2 className="ab-manifesto__title">
                Four things<br /><em>we won't budge on.</em>
              </h2>
            </div>

            <div className="ab-manifesto__list">
              {MANIFESTO.map((m, i) => (
                <div
                  key={i}
                  className={`ab-m-item ${manifestoVis ? 'ab-m-item--in' : ''}`}
                  style={{ '--di': i }}
                >
                  <span className="ab-m-item__n">{m.n}</span>
                  <div className="ab-m-item__content">
                    <h3 className="ab-m-item__head">{m.head}</h3>
                    <p className="ab-m-item__body">{m.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ TEAM ══ */}
        <section className="ab-team">
          <div className="ab-team__wrap">
            <div className="ab-team__hdr">
              <span className="ab-eyebrow">The team</span>
              <h2 className="ab-team__title">
                Five people<br />building this.
              </h2>
              <p className="ab-team__sub">Flip each card to meet them.</p>
            </div>

            <div className="ab-team__grid">
              {TEAM.map((m, i) => (
                <TeamCard key={m.id} member={m} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ══ STATS BAND ══ */}
        <div className="ab-stats" ref={statsRef}>
          {STATS.map((s, i) => (
            <div key={i} className={`ab-stats__item ${statsVis ? 'ab-stats__item--in' : ''}`} style={{ '--si': i }}>
              <span className="ab-stats__val">{s.val}</span>
              <span className="ab-stats__lbl">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ══ CTA ══ */}
        <section className="ab-cta">
          <div className="ab-cta__wrap">
            <h2 className="ab-cta__title">
              Ready to find<br /><em>your gym?</em>
            </h2>
            <p className="ab-cta__sub">
              Join 1,000+ Filipinos who stopped settling and started training.
            </p>
            <Link to="/login?mode=signup" className="ab-cta__btn">
              Get started free <ArrowRight size={15} />
            </Link>
          </div>
        </section>

      </div>
      <Footer />
      <ScrollThemeWidget />
    </>
  );
}