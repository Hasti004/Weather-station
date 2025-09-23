import React from 'react';

export function Hero() {
  return (
    <section className="hero">
      {/* Glow wrapper to allow independent rotation without interfering with child transforms */}
      <div className="hero-glow-wrap" aria-hidden="true">
        {/* Core Aura layer - soft, large radial gradient */}
        <div className="hero-glow-core-aura"></div>

        {/* Color Drift layer - offset elliptical gradient */}
        <div className="hero-glow-color-drift"></div>

        {/* Subtle Sheen Arc layer - horizontal gradient stripe */}
        <div className="hero-glow-sheen-arc"></div>
      </div>

      <div className="hero-inner">
        <button className="hero-ghost" aria-label="Open menu">
          <span aria-hidden="true">≡</span>
        </button>
        <h2 className="hero-title">Weather</h2>
        <p className="hero-subtitle">Your Weather, Visualized Smarter.</p>
      </div>
    </section>
  );
}

