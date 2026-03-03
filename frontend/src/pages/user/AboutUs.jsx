import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { 
  ArrowRight, Linkedin, Twitter, Github, Mail, 
  Target, Zap, Heart, Users, Shield, Eye, MapPin
} from 'lucide-react';
import './AboutUs.css';

const TEAM = [
  {
    id: 1,
    name: 'Juan Dela Cruz',
    role: 'Founder & CEO',
    quote: 'Built ExerSearch after wasting 3 weeks finding a gym in Pasig.',
    image: 'test.jpg',
    color: '#d23f0b',
    socials: { linkedin: '#', twitter: '#', email: 'juan@exersearch.com' }
  },
  {
    id: 2,
    name: 'Maria Santos',
    role: 'Lead Developer',
    quote: 'Turning coffee into code since 2015. Love building things that scale.',
    image: 'test1.png',
    color: '#3b82f6',
    socials: { github: '#', linkedin: '#', email: 'maria@exersearch.com' }
  },
  {
    id: 3,
    name: 'Carlo Reyes',
    role: 'Head of Design',
    quote: 'Making fitness apps that don\'t look like garbage.',
    image: 'test1.png',
    color: '#8b5cf6',
    socials: { linkedin: '#', twitter: '#', email: 'carlo@exersearch.com' }
  },
  {
    id: 4,
    name: 'Anna Fernandez',
    role: 'Growth Lead',
    quote: 'Took us from 0 to 10K users. Now aiming for 100K.',
    image: 'test.jpg',
    color: '#f59e0b',
    socials: { twitter: '#', linkedin: '#', email: 'anna@exersearch.com' }
  },
  {
    id: 5,
    name: 'Rico Patel',
    role: 'Community Manager',
    quote: 'Your fitness journey starts here. I\'m here to help.',
    image: 'test1.png',
    color: '#10b981',
    socials: { twitter: '#', linkedin: '#', email: 'rico@exersearch.com' }
  }
];

const FACTS = [
  { icon: Users, value: '1,000+', label: 'Active Users', color: '#3b82f6' },
  { icon: MapPin, value: '50+', label: 'Partner Gyms', color: '#d23f0b' },
  { icon: Zap, value: '5,000+', label: 'Workouts', color: '#f59e0b' },
  { icon: Heart, value: '4.9/5', label: 'Rating', color: '#10b981' }
];

export default function AboutFinal() {
  const [activeTeam, setActiveTeam] = useState(0);
  const [activeFact, setActiveFact] = useState(0);
  const [activeStory, setActiveStory] = useState(1);

  // Auto-rotate facts every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFact((prev) => (prev + 1) % FACTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Auto-rotate story/images every 4s
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStory((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="about-final">
      <Header />

      {/* HERO - Gradient with animated stats */}
      <section className="final-hero">
        <div className="final-hero-bg"></div>
        <div className="final-hero-content">
          <span className="final-badge">ABOUT US</span>
          <h1>Making fitness accessible to every Filipino</h1>
          <p>We're 5 people on a mission to fix gym discovery in Manila. No BS. Just real reviews and real results.</p>
          
          {/* Interactive rotating stats */}
          <div className="final-hero-interactive">
            <div className="fhi-display">
              {FACTS.map((fact, index) => {
                const Icon = fact.icon;
                return (
                  <div 
                    key={index}
                    className={`fhi-item ${activeFact === index ? 'active' : ''}`}
                  >
                    <div className="fhi-icon-wrap" style={{ background: fact.color }}>
                      <Icon size={40} />
                    </div>
                    <h3>{fact.value}</h3>
                    <p>{fact.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="fhi-dots">
              {FACTS.map((fact, index) => (
                <button
                  key={index}
                  className={`fhi-dot ${activeFact === index ? 'active' : ''}`}
                  style={{ background: activeFact === index ? fact.color : '#e5e7eb' }}
                  onClick={() => setActiveFact(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT US - Interactive with auto-switching images */}
      <section className="final-about">
        <div className="final-about-container">
          <div className="fa-left">
            <span className="section-badge">OUR STORY</span>
            <h2>From Problem to Solution</h2>
            
            <div 
              className={`fa-story-block ${activeStory === 0 ? 'active' : ''}`}
              onMouseEnter={() => setActiveStory(0)}
            >
              <div className="fa-icon fa-icon-problem">
                <Target size={24} />
              </div>
              <div>
                <h4>The Problem</h4>
                <p>Finding a gym in Manila was broken. Fake reviews, hidden prices, stock photos. People wasted weeks visiting 5+ gyms just to pick one.</p>
              </div>
            </div>

            <div 
              className={`fa-story-block ${activeStory === 1 ? 'active' : ''}`}
              onMouseEnter={() => setActiveStory(1)}
            >
              <div className="fa-icon fa-icon-solution">
                <Zap size={24} />
              </div>
              <div>
                <h4>The Solution</h4>
                <p>We built the platform we wished existed. Real photos from members, verified reviews, transparent pricing, AI workout plans. Everything free.</p>
              </div>
            </div>

            <div 
              className={`fa-story-block ${activeStory === 2 ? 'active' : ''}`}
              onMouseEnter={() => setActiveStory(2)}
            >
              <div className="fa-icon fa-icon-mission">
                <Heart size={24} />
              </div>
              <div>
                <h4>The Mission</h4>
                <p>Make fitness accessible to every Filipino. Whether you have ₱500 or ₱5000. Whether you're in Pasig or Paranaque. Better tools, better outcomes.</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="fa-progress-bar">
              <div 
                className="fa-progress-fill" 
                style={{ 
                  width: `${((activeStory + 1) / 3) * 100}%`,
                  background: activeStory === 0 ? '#3b82f6' : activeStory === 1 ? '#d23f0b' : '#10b981'
                }}
              />
            </div>
          </div>

          <div className="fa-right">
            <div className="fa-image-slider">
              <div className={`fa-slide ${activeStory === 0 ? 'active' : ''}`}>
                <img 
                  src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600&h=800&fit=crop&q=80" 
                  alt="Problem" 
                />
                <div className="fa-slide-overlay fa-overlay-problem"></div>
              </div>
              <div className={`fa-slide ${activeStory === 1 ? 'active' : ''}`}>
                <img 
                  src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=800&fit=crop&q=80" 
                  alt="Solution" 
                />
                <div className="fa-slide-overlay fa-overlay-solution"></div>
              </div>
              <div className={`fa-slide ${activeStory === 2 ? 'active' : ''}`}>
                <img 
                  src="https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&h=800&fit=crop&q=80" 
                  alt="Mission" 
                />
                <div className="fa-slide-overlay fa-overlay-mission"></div>
              </div>
              <div className="fa-image-badge">
                <MapPin size={16} />
                <span>Based in Pasig, PH</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TEAM - Interactive Slider */}
      <section className="final-team">
        <div className="final-team-header">
          <span className="section-badge">THE TEAM</span>
          <h2>Meet the People Behind ExerSearch</h2>
          <p>Five passionate individuals building the future of Filipino fitness</p>
        </div>

        <div className="final-team-showcase">
          <div className="final-team-main">
            <div className="ftm-image" style={{ borderColor: TEAM[activeTeam].color }}>
              <img src={TEAM[activeTeam].image} alt={TEAM[activeTeam].name} />
              <div className="ftm-badge" style={{ background: TEAM[activeTeam].color }}>
                {activeTeam + 1} / 5
              </div>
            </div>
            <div className="ftm-info">
              <h3>{TEAM[activeTeam].name}</h3>
              <p className="ftm-role" style={{ color: TEAM[activeTeam].color }}>
                {TEAM[activeTeam].role}
              </p>
              <p className="ftm-quote">"{TEAM[activeTeam].quote}"</p>
              <div className="ftm-socials">
                {TEAM[activeTeam].socials.github && (
                  <a href={TEAM[activeTeam].socials.github}><Github size={18} /></a>
                )}
                {TEAM[activeTeam].socials.linkedin && (
                  <a href={TEAM[activeTeam].socials.linkedin}><Linkedin size={18} /></a>
                )}
                {TEAM[activeTeam].socials.twitter && (
                  <a href={TEAM[activeTeam].socials.twitter}><Twitter size={18} /></a>
                )}
                <a href={`mailto:${TEAM[activeTeam].socials.email}`}><Mail size={18} /></a>
              </div>
            </div>
          </div>

          <div className="final-team-thumbs">
            {TEAM.map((member, index) => (
              <div
                key={member.id}
                className={`ft-thumb ${activeTeam === index ? 'active' : ''}`}
                onClick={() => setActiveTeam(index)}
                style={{ borderColor: activeTeam === index ? member.color : 'transparent' }}
              >
                <img src={member.image} alt={member.name} />
                <div className="ft-thumb-overlay" style={{ background: `linear-gradient(180deg, transparent 0%, ${member.color}ee 100%)` }}>
                  <span>{member.name.split(' ')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="final-values">
        <span className="section-badge">CORE VALUES</span>
        <h2>What Drives Us</h2>
        <div className="final-values-grid">
          <div className="fv-card">
            <div className="fv-icon-wrap fv-icon-1">
              <Zap size={24} />
            </div>
            <div className="fv-content">
              <h4>Always Free</h4>
              <p>No paywalls. No premium tiers. Gyms pay us so you don't have to.</p>
            </div>
          </div>

          <div className="fv-card">
            <div className="fv-icon-wrap fv-icon-2">
              <Shield size={24} />
            </div>
            <div className="fv-content">
              <h4>Radically Honest</h4>
              <p>Real reviews from verified users only. Zero tolerance for fakes.</p>
            </div>
          </div>

          <div className="fv-card">
            <div className="fv-icon-wrap fv-icon-3">
              <Eye size={24} />
            </div>
            <div className="fv-content">
              <h4>User-Centered</h4>
              <p>Every feature starts with research. You drive our roadmap.</p>
            </div>
          </div>

          <div className="fv-card">
            <div className="fv-icon-wrap fv-icon-4">
              <Heart size={24} />
            </div>
            <div className="fv-content">
              <h4>Filipino First</h4>
              <p>Built for local culture, budgets, and fitness preferences.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="final-cta">
        <div className="final-cta-inner">
          <h2>Ready to find your perfect gym?</h2>
          <p>Join 1,000+ Filipinos transforming their fitness</p>
          <Link to="/onboarding" className="final-btn">
            Get Started Free
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}