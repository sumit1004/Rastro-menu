import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Smartphone,
  Zap,
  Box,
  UtensilsCrossed,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import './Auth.css';

export const AuthBrand = ({ className = '' }) => (
  <Link to="/" className={`auth-brand ${className}`}>
    RASTRO<span className="auth-brand-accent">menu</span>
    <span className="auth-brand-arc" aria-hidden />
  </Link>
);

const FEATURES = [
  { icon: Smartphone, label: 'No App Required' },
  { icon: Zap, label: 'Real-Time Ordering' },
  { icon: Box, label: '3D AR Food Preview' },
];

const STATS = [
  { icon: UtensilsCrossed, value: '500+', label: 'Restaurants' },
  { icon: ShoppingBag, value: '10K+', label: 'Orders' },
  { icon: TrendingUp, value: '98%', label: 'Faster Ordering' },
];

const AuthLayout = ({ children }) => (
  <div className="auth-page">
    <div className="auth-page-bg" aria-hidden>
      <span className="auth-orb auth-orb-1" />
      <span className="auth-orb auth-orb-2" />
      <span className="auth-orb auth-orb-3" />
    </div>

    <Link to="/" className="auth-back-home">
      <ArrowLeft size={18} aria-hidden />
      Back to Home
    </Link>

    <div className="auth-shell">
      <div className="auth-left-panel">
        <div className="auth-promo-copy">
          <AuthBrand className="auth-brand-promo" />

          <h1 className="auth-headline">
            Experience Food <span className="auth-headline-accent">Before You Order</span>
          </h1>
          <p className="auth-tagline">
            Transform your restaurant into an immersive AR dining experience.
          </p>

          <div className="auth-feature-row">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="auth-feature-pill">
                <span className="auth-feature-icon">
                  <Icon size={18} strokeWidth={2.25} />
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="auth-stats-row">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="auth-stat-card">
                <span className="auth-stat-icon">
                  <Icon size={22} strokeWidth={2} />
                </span>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-hero-visual">
          <div className="auth-hero-glow" aria-hidden />
          <img
            src="/mobile.png"
            alt="Scan QR code to view AR menu on your phone"
            className="auth-hero-img"
            width={420}
            height={520}
            loading="eager"
          />
        </div>
      </div>

      <main className="auth-main">{children}</main>
    </div>
  </div>
);

export default AuthLayout;
