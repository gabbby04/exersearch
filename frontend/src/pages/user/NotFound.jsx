import React from "react";
import { Link } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { useTheme } from "./ThemeContext";
import ScrollThemeWidget from "../../utils/ScrollThemeWidget";
import { Home, ArrowRight, Dumbbell, Search, RotateCcw } from "lucide-react";
import "./NotFound.css";

    

export default function NotFound() {
  const { isDark } = useTheme();

  return (
    <>
      <Header />
      <div className="nf-page" data-theme={isDark ? "dark" : "light"}>

        {/* Animated top progress bar */}
        <div className="nf-progress" />

        {/* Grid bg */}
        <div className="nf-grid" />

        {/* Orange ambient glow */}
        <div className="nf-glow" />

        {/* Main content */}
        <div className="nf-inner">

          {/* Giant 404 with split color effect */}
          <div className="nf-giant">
            <span className="nf-giant-text">404</span>
            <span className="nf-giant-fill" aria-hidden="true">404</span>
          </div>

          {/* Divider with spinning icon */}
          <div className="nf-divider">
            <div className="nf-divider-line" />
            <div className="nf-divider-icon">
              <Dumbbell size={18} />
            </div>
            <div className="nf-divider-line" />
          </div>

          {/* Headline */}
          <h1 className="nf-headline">
            This rep <em>didn't count.</em>
          </h1>

          {/* Subtext */}
          <p className="nf-sub">
            The page you're looking for skipped today's workout.
            No sweat — let's get you back on track.
          </p>

          {/* Actions */}
          <div className="nf-actions">
            <Link to="/" className="nf-btn-primary">
              <Home size={16} />
              Back to Home
              <ArrowRight size={15} />
            </Link>
            <Link to="/home/find-gyms" className="nf-btn-ghost">
              <Search size={15} />
              Find a Gym
            </Link>
          </div>

        </div>
      </div>
      <Footer />
      <ScrollThemeWidget />
    </>
  );
}