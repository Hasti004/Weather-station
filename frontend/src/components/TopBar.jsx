import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import heroImage from '../data/Hero_image.png';

export default function TopBar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`topbar ${isScrolled ? 'scrolled' : ''}`} role="banner">
      <div className="brand" aria-label="Organization">
        <div className="brand-logo">
          <img
            src={heroImage}
            alt="Physical Research Laboratory Logo"
          />
        </div>
        <div className="brand-text">
          <h1>Physical Research Laboratory</h1>
          <p>Weather Monitoring Division</p>
        </div>
      </div>
      <nav className="nav" aria-label="Primary">
        <Link to="/data">View Data</Link>
        <a href="/contact">Contact</a>
      </nav>
    </header>
  );
}

