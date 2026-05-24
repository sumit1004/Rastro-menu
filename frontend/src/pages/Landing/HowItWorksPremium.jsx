import React from 'react';
import {
  Rocket,
  Smartphone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import './HowItWorksPremium.css';

const steps = [
  {
    id: '01',
    title: 'Upload Menu',
    description: 'Easily upload your menu, photos, and descriptions through our dashboard.',
    image: '/1st.png',
  },
  {
    id: '02',
    title: 'Customers Scan QR',
    description: 'Customers scan a unique QR code at their table to launch the AR menu.',
    image: '/2nd.png',
  },
  {
    id: '03',
    title: 'View AR Dish',
    description: 'The menu items appear in stunning 3D AR right on their table.',
    image: '/4th.png',
    featured: true,
  },
  {
    id: '04',
    title: 'Orders Instantly',
    description: 'Orders are sent instantly to your kitchen display system.',
    image: '/3rd.png',
  },
];

const features = [
  { icon: Rocket, title: 'Fast Setup', text: 'Get started in minutes' },
  { icon: Smartphone, title: 'No App Required', text: 'Works on any device' },
  { icon: Sparkles, title: 'Immersive 3D AR', text: 'Realistic & interactive' },
  { icon: ShieldCheck, title: 'Secure & Reliable', text: 'Enterprise-grade security' },
  { icon: TrendingUp, title: 'Boost Engagement', text: 'Increase customer delight' },
];

const mobileHighlights = ['Scan QR at table', 'View dishes in AR', 'Order in seconds'];

const HowItWorksPremium = () => {
  return (
    <section id="how-it-works" className="hiw-section">
      <span className="hiw-sparkle hiw-sparkle--1" aria-hidden>
        ✦
      </span>

      <div className="hiw-container">
        <header className="hiw-header">
          <span className="hiw-badge">How It Works</span>
          <h2 className="hiw-title">
            Experience Food
            <span className="hiw-title-accent">Before You Order</span>
          </h2>
          <p className="hiw-subtitle">
            Our AR menu platform makes dining more visual, engaging, and simple.
          </p>
        </header>

        <div className="hiw-mobile-banner">
          <strong>Scan. Preview in AR. Order instantly.</strong>
          <span>No app download required for your customers.</span>
        </div>

        <div className="hiw-main">
          <div className="hiw-hero">
            <div className="hiw-mobile-pills">
              {mobileHighlights.map((label) => (
                <span key={label} className="hiw-mobile-pill">
                  {label}
                </span>
              ))}
            </div>

            <div className="hiw-mobile-mockup">
              <img src="/mobile.png" alt="AR menu on mobile phone" />
            </div>
          </div>

          <div className="hiw-steps-wrap">
            <div className="hiw-steps-line" aria-hidden />
            <div className="hiw-steps">
              {steps.map((step) => (
                <article
                  key={step.id}
                  className={`hiw-step${step.featured ? ' hiw-step--featured' : ''}`}
                >
                  <span className="hiw-step-num">{step.id}</span>
                  <div className="hiw-step-preview">
                    <img src={step.image} alt={step.title} />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
            <p className="hiw-swipe-hint">Swipe to explore all steps →</p>
          </div>
        </div>

        <div className="hiw-features">
          <p className="hiw-features-heading">Why restaurants choose RASTROmenu</p>
          <div className="hiw-features-grid">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="hiw-feature-item">
                  <span className="hiw-feature-icon">
                    <Icon size={18} />
                  </span>
                  <div className="hiw-feature-text">
                    <strong>{feature.title}</strong>
                    <span>{feature.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksPremium;
