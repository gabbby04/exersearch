// src/pages/user/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Check localStorage for saved theme, default to 'light'
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('exersearch-theme');
    return saved ? saved === 'dark' : false;  // false = light by default
  });

  // Light mode colors
const lightTheme = {
  // Orange palette
  primary: '#ff5a16',
  primaryMedium: '#fc4a00',
  primaryDark: '#ab3200',
  primaryDim: 'rgba(255, 90, 22, 0.10)',
  primaryGlow: 'rgba(255, 90, 22, 0.25)',

  // Backgrounds
  bgPrimary: '#ffffff',
  bgSecondary: '#f4f7fb',
  bgTertiary: '#edf1f7',
  bgAccent: '#e4eaf3',

  // Text colors
  textPrimary: '#0b1017',
  textSecondary: 'rgba(11, 16, 23, 0.82)',
  textTertiary: 'rgba(11, 16, 23, 0.62)',
  textMuted: 'rgba(11, 16, 23, 0.42)',

  // UI elements
  border: 'rgba(11, 16, 23, 0.12)',
  shadow: 'rgba(11, 16, 23, 0.10)',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

  // Dark mode colors
  const darkTheme = {
    // Orange palette (same)
    primary: '#ff5a16',
    primaryMedium: '#fc4a00',
    primaryDark: '#ab3200',
    primaryDim: 'rgba(255, 90, 22, 0.12)',
    primaryGlow: 'rgba(255, 90, 22, 0.3)',
    
    // Backgrounds
    bgPrimary: '#0d141b',
    bgSecondary: '#101820',
    bgTertiary: '#181718',
    bgAccent: '#1e1c1e',
    
    // Text colors
    textPrimary: '#ffffff',
    textSecondary: '#ebf0f5',
    textTertiary: '#f1f4f8',
    textMuted: 'rgba(255, 255, 255, 0.6)',
    
    // UI elements
    border: 'rgba(255, 255, 255, 0.1)',
    shadow: 'rgba(0, 0, 0, 0.5)',
    overlay: 'rgba(0, 0, 0, 0.8)',
  };

  const theme = isDark ? darkTheme : lightTheme;

  // Toggle function
  const toggleTheme = () => {
    setIsDark(prev => {
      const newValue = !prev;
      localStorage.setItem('exersearch-theme', newValue ? 'dark' : 'light');
      return newValue;
    });
  };

  // Inject CSS variables into :root
  useEffect(() => {
    const root = document.documentElement;
    
    // Orange palette
    root.style.setProperty('--lnd-or', theme.primary);
    root.style.setProperty('--lnd-or-md', theme.primaryMedium);
    root.style.setProperty('--lnd-or-dk', theme.primaryDark);
    root.style.setProperty('--lnd-or-dim', theme.primaryDim);
    root.style.setProperty('--lnd-or-glow', theme.primaryGlow);
    
    // Backgrounds
    root.style.setProperty('--lnd-bg-primary', theme.bgPrimary);
    root.style.setProperty('--lnd-bg-secondary', theme.bgSecondary);
    root.style.setProperty('--lnd-bg-tertiary', theme.bgTertiary);
    root.style.setProperty('--lnd-bg-accent', theme.bgAccent);
    
    // Text
    root.style.setProperty('--lnd-text-primary', theme.textPrimary);
    root.style.setProperty('--lnd-text-secondary', theme.textSecondary);
    root.style.setProperty('--lnd-text-tertiary', theme.textTertiary);
    root.style.setProperty('--lnd-text-muted', theme.textMuted);
    
    // UI
    root.style.setProperty('--lnd-border', theme.border);
    root.style.setProperty('--lnd-shadow', theme.shadow);
    root.style.setProperty('--lnd-overlay', theme.overlay);
    
    // Add data attribute for CSS targeting
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, [theme, isDark]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};


export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};