// src/utils/ScrollThemeWidget.jsx
import React, { useState, useEffect } from 'react';
import { ArrowUp, Moon, Sun } from 'lucide-react';
import { useTheme } from '../pages/user/ThemeContext';
import './Widget.css';

export default function ScrollThemeWidget() {
  const { isDark, toggleTheme } = useTheme();
  const [showScroll, setShowScroll] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Show scroll button when scrolled down 300px
  useEffect(() => {
    const handleScroll = () => {
      setShowScroll(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div 
      className={`stw-widget stw-widget--show ${expanded ? 'stw-widget--expanded' : ''}`} // ← REMOVED CONDITIONAL
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Scroll to top button - only show when scrolled */}
      {showScroll && (
        <button 
          className="stw-trigger"
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <ArrowUp size={20} />
        </button>
      )}

      {/* Theme toggle - ALWAYS visible */}
      <button
        className="stw-theme stw-theme--always"
        onClick={(e) => {
          e.stopPropagation();
          toggleTheme();
        }}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
}