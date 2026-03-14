import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import Header from "./Header";
import Footer from "./Footer";
import "./philosophy.scss";
import "./Philosophy.css"

import ScrollThemeWidget from "../../utils/ScrollThemeWidget";
import {
  CheckCircle2,
  Compass,
  Dumbbell,
  UtensilsCrossed,
  Store,
  Users,
  Megaphone,
} from "lucide-react";

const panels = [
  {
    front: "/philo1.png",
    right: "/philo5.png",
    back:  "/philo1.png",
    left:  "/philo5.png",
  },
  {
    front: "/philo2.png",
    right: "/philo4.png",
    back:  "/philo2.png",
    left:  "/philo4.png",
  },
  {
    front: "/philo3.png",
    right: "/philo3.png",
    back:  "/philo3.png",
    left:  "/philo3.png",
  },
  {
    front: "/philo4.png",
    right: "/philo2.png",
    back:  "/philo4.png",
    left:  "/philo2.png",
  },
  {
    front: "/philo5.png",
    right: "/philo1.png",
    back:  "/philo5.png",
    left:  "/philo1.png",
  },
];

const principles = [
  {
    icon: <Compass size={22} />,
    title: "Accessible information",
    desc: "We turn fitness into something clearer and easier to navigate, so people can make better decisions without feeling overwhelmed.",
  },
  {
    icon: <CheckCircle2 size={22} />,
    title: "Beginner-friendly guidance",
    desc: "Starting should not feel embarrassing, confusing, or intimidating. We want beginners to feel supported and informed from day one.",
  },
  {
    icon: <Dumbbell size={22} />,
    title: "Useful, practical tools",
    desc: "We build tools people can actually use in real life, from workout plans and gym discovery to meal planning support.",
  },
];

const userFeatures = [
  {
    icon: <Dumbbell size={22} />,
    title: "Workout Plans That Fit",
    desc: "We help users build workout plans that match their goals, experience level, and lifestyle.",
  },
  {
    icon: <Compass size={22} />,
    title: "Find The Right Gym",
    desc: "We make it easier to discover gyms that suit personal preferences, needs, and comfort level.",
  },
  {
    icon: <UtensilsCrossed size={22} />,
    title: "Meal Planning Support",
    desc: "We help make nutrition more manageable through meal planning that supports each fitness journey.",
  },
  {
    icon: <CheckCircle2 size={22} />,
    title: "Less Intimidating Start",
    desc: "We make fitness feel less confusing and less scary for beginners by giving clearer guidance from the start.",
  },
];

const ownerFeatures = [
  {
    icon: <Store size={22} />,
    title: "Greater visibility",
    desc: "We help owners showcase their gyms and services so more potential members can discover them.",
  },
  {
    icon: <Megaphone size={22} />,
    title: "Stronger promotion",
    desc: "We give fitness businesses a better way to present what makes them different and why they are a good fit.",
  },
  {
    icon: <Users size={22} />,
    title: "Meaningful connections",
    desc: "We help connect owners with users who are actively looking for fitness solutions that match their preferences.",
  },
];

export default function OurPhilosophyPage() {
  const heroRef   = useRef(null);
  const tappedRef = useRef(false);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const ctx = gsap.context(() => {
      gsap.set(".philoPanel__cuboid", {
        transformPerspective: 1800,
        transformStyle: "preserve-3d",
      });

      gsap.set(".philoPanel", {
        transformPerspective: 1800,
        transformStyle: "preserve-3d",
      });

      gsap.from(".philoPanel", {
        y: 36,
        opacity: 0,
        rotateY: 16,
        stagger: 0.08,
        duration: 1.15,
        ease: "power3.out",
      });

      gsap.from(".philoPanel__face img", {
        scale: 1.08,
        stagger: 0.04,
        duration: 1.8,
        ease: "power3.out",
      });

      gsap.from(".philoHero__content", {
        y: 28,
        opacity: 0,
        duration: 1.1,
        delay: 0.2,
        ease: "power3.out",
      });

      const tl = gsap.timeline({
        paused: true,
        defaults: { duration: 0.95, ease: "power3.inOut" },
      });

      tl.to(".philoPanel--1", { xPercent: -80 }, 0)
        .to(".philoPanel--2", { xPercent: -40 }, 0)
        .to(".philoPanel--3", { xPercent:   0 }, 0)
        .to(".philoPanel--4", { xPercent:  40 }, 0)
        .to(".philoPanel--5", { xPercent:  80 }, 0)
        .to(".philoPanel--1 .philoPanel__cuboid", { rotateY: -90 }, 0)
        .to(".philoPanel--2 .philoPanel__cuboid", { rotateY: -90 }, 0)
        .to(".philoPanel--3 .philoPanel__cuboid", { rotateY:   0 }, 0)
        .to(".philoPanel--4 .philoPanel__cuboid", { rotateY:  90 }, 0)
        .to(".philoPanel--5 .philoPanel__cuboid", { rotateY:  90 }, 0);

      const onEnter = () => tl.play();
      const onLeave = () => {
        tappedRef.current = false;
        tl.reverse();
      };
      const onTouch = () => {
        if (tappedRef.current) {
          tappedRef.current = false;
          tl.reverse();
        } else {
          tappedRef.current = true;
          tl.play();
        }
      };

      hero.addEventListener("mouseenter", onEnter);
      hero.addEventListener("mouseleave", onLeave);
      hero.addEventListener("touchstart",  onTouch);

      return () => {
        hero.removeEventListener("mouseenter", onEnter);
        hero.removeEventListener("mouseleave", onLeave);
        hero.removeEventListener("touchstart",  onTouch);
      };
    }, hero);

    return () => ctx.revert();
  }, []);

  return (
    <>
      <Header />

      <div className="fq ph-page">

        {/* ── HERO ── */}
        <section className="philoHero">
          <div className="philoHero__hero" ref={heroRef}>

            <div className="philoHero__panels">
              {panels.map((panel, index) => (
                <div className={`philoPanel philoPanel--${index + 1}`} key={index}>
                  <div className="philoPanel__cuboid">
                    <div className="philoPanel__face philoPanel__face--front">
                      <img src={panel.front} alt="" />
                    </div>
                    <div className="philoPanel__face philoPanel__face--right">
                      <img src={panel.right} alt="" />
                    </div>
                    <div className="philoPanel__face philoPanel__face--back">
                      <img src={panel.back} alt="" />
                    </div>
                    <div className="philoPanel__face philoPanel__face--left">
                      <img src={panel.left} alt="" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="philoHero__overlay" />

            <div className="philoHero__content">
              <p className="philoHero__eyebrow">OUR PHILOSOPHY</p>
              <h1>We make fitness feel accessible, guided, and less intimidating.</h1>
            </div>
          </div>
        </section>

        {/* ── PRINCIPLES ── */}
        <section className="ph-principles">
          <div className="fq-wrap">
            <div className="ph-principles__hdr">
              <p className="ph-eyebrow">Our Principles</p>
              <h2 className="ph-principles__title">
                We make fitness feel more <em>understandable</em>, more supportive, and more real.
              </h2>
              <p className="ph-principles__sub">
                ExerSearch exists to make fitness information easier to access and easier to
                act on. We believe people should not feel lost when trying to build a routine,
                find the right gym, or figure out meals that support their goals.
              </p>
            </div>

            <div className="ph-principles__grid">
              {principles.map((item, i) => (
                <div key={i} className="ph-card">
                  <span className="ph-card__num">0{i + 1}</span>
                  <div className="ph-card__ico">{item.icon}</div>
                  <h3 className="ph-card__title">{item.title}</h3>
                  <p className="ph-card__desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA 1 ── */}
        <section className="ph-cta">
          <div className="fq-wrap ph-cta__inner">
            <div className="ph-cta__left">
              <span className="ph-cta__label">Why It Matters</span>
              <h2 className="ph-cta__title">
                Fitness should not feel like <em>hidden knowledge</em>
              </h2>
              <p className="ph-cta__sub">
                The right guidance, tools, and access can help more people begin with
                confidence and stay consistent.
              </p>
            </div>
          </div>
        </section>

        {/* ── FOR USERS ── */}
        <section className="philoUsersAlt">
          <div className="fq-wrap">
            <div className="philoUsersAlt__head">
              <p className="philoUsersAlt__eyebrow">FOR USERS</p>
              <h2 className="philoUsersAlt__title">What We Do For Users</h2>
              <p className="philoUsersAlt__sub">
                We help people navigate fitness with more clarity, less pressure, and tools
                that feel practical in real life.
              </p>
            </div>

            <div className="philoUsersAlt__grid">
              {userFeatures.map((item, i) => (
                <article key={i} className="philoUsersAlt__card">
                  <div className="philoUsersAlt__icon">{item.icon}</div>
                  <div className="philoUsersAlt__body">
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA 2 ── */}
        <section className="ph-cta">
          <div className="fq-wrap ph-cta__inner">
            <div className="ph-cta__left">
              <span className="ph-cta__label">The Bigger Picture</span>
              <h2 className="ph-cta__title">
                Better guidance creates better <em>confidence</em>
              </h2>
              <p className="ph-cta__sub">
                When people understand their options, fitness becomes less scary, less
                confusing, and more sustainable.
              </p>
            </div>
          </div>
        </section>

        {/* ── FOR OWNERS ── */}
        <section className="ph-owners">
          <div className="fq-wrap">
            <div className="ph-owners__hdr">
              <p className="ph-owners__eyebrow">FOR OWNERS</p>
              <h2 className="ph-owners__title">
                We give fitness businesses more <em>visibility</em> and better ways to connect
              </h2>
              <p className="ph-owners__sub">
                ExerSearch is not only for users. We also help gym owners and fitness
                businesses promote themselves, reach more people, and become easier to
                discover by the audiences that matter to them.
              </p>
            </div>

            <div className="ph-owners__grid">
              {ownerFeatures.map((item, i) => (
                <div key={i} className="ph-ocard">
                  <span className="ph-ocard__num">0{i + 1}</span>
                  <div className="ph-ocard__ico">{item.icon}</div>
                  <h3 className="ph-ocard__title">{item.title}</h3>
                  <p className="ph-ocard__desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>

      <Footer />
      <ScrollThemeWidget/>
    </>
  );
}