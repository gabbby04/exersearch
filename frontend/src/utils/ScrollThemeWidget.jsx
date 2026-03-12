// src/utils/ScrollThemeWidget.jsx
import React, { useState, useEffect } from 'react';
import { ArrowUp, Moon, Sun } from 'lucide-react';
import { useTheme } from '../pages/user/ThemeContext';
import './Widget.css';

export default function ScrollThemeWidget() {
  const { isDark, toggleTheme } = useTheme();
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScroll(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="stw-widget" data-theme={isDark ? 'dark' : 'light'}>
      {showScroll && (
        <button
          className="stw-trigger"
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <ArrowUp size={18} />
        </button>
      )}
      <button
        className="stw-theme"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
}