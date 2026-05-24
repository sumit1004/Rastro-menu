import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Button from '../../components/Button';
import HowItWorksPremium from './HowItWorksPremium';
import { AuthContext } from '../../context/AuthContext';
import { PRICING, TRIAL_DAYS, getYearlySavings } from '../../config/pricing';
import { Box, Zap, Smartphone, BarChart3, Check } from 'lucide-react';
import './Landing.css';

const LandingPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly');

  const handleCta = () => {
    navigate(user ? '/dashboard' : '/signup');
  };

  const formatInr = (amount) => `\u20B9${amount.toLocaleString('en-IN')}`;

  const formatPrice = (plan) => {
    if (plan === 'free') return { main: '\u20B90', sub: 'forever free' };
    const amount = PRICING[plan][billingCycle];
    if (billingCycle === 'yearly') {
      return {
        main: formatInr(amount),
        sub: `per year · ${formatInr(Math.round(amount / 12))}/mo`,
      };
    }
    return {
      main: formatInr(amount),
      sub: 'per month',
    };
  };

  const proPrice = formatPrice('pro');
  const premiumPrice = formatPrice('premium');

  return (
    <div className="landing-page">
      <Navbar />

      <section className="hero">
        <div className="container hero-container">
          <div className="hero-content">
            <h1>Turn Your Restaurant Menu Into an Interactive AR Ordering Experience</h1>
            <p>
              Elevate dining with QR-scanned augmented reality menus and seamless realtime
              ordering. Transform how your customers order and engage.
            </p>
            <div className="hero-cta">
              <Button onClick={handleCta}>Start Free Trial</Button>
              <Button variant="outline" onClick={handleCta}>Watch Demo</Button>
            </div>
          </div>
          <div className="hero-image">
            <div className="mockup-frame-transparent">
              <img src="/hero.png" alt="AR Burger on Phone" className="ar-mockup-img" />
            </div>
          </div>
        </div>
      </section>

      <HowItWorksPremium />

      <section className="ar-previews">
        <div className="container ar-previews-container">
          <div className="ar-previews-content">
            <h2>Immersive AR Previews</h2>
            <h3>Experience Food Before Ordering</h3>
            <p>
              Let customers see photorealistic previews of your dishes in their environment.
              Increase appetite and reduce uncertainty.
            </p>
          </div>
          <div className="ar-previews-image">
            <div className="mockup-landscape-frame">
              <img src="/section.png" alt="AR Steak Preview" />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features-section">
        <div className="container text-center">
          <div className="section-header">
            <h2 className="hiw-title-accent" >Built for Modern Restaurants</h2>
            <p className="hiw-subtitle" >Powerful features to run your front-of-house digitally.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="icon-wrapper"><Box size={32} /></div>
              <h3>AR Dish Preview</h3>
              <p>High-fidelity AR previews for every dish on Pro and Premium.</p>
            </div>
            <div className="feature-card">
              <div className="icon-wrapper"><Zap size={32} /></div>
              <h3>Realtime Orders</h3>
              <p>Instant order transmission to your dashboard and kitchen.</p>
            </div>
            <div className="feature-card">
              <div className="icon-wrapper"><Smartphone size={32} /></div>
              <h3>Mobile Dashboard</h3>
              <p>Manage orders and menu on the go from any device.</p>
            </div>
            <div className="feature-card">
              <div className="icon-wrapper"><BarChart3 size={32} /></div>
              <h3>Analytics</h3>
              <p>Track menu performance and customer insights.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="pricing-section">
        <div className="container text-center">
          <div className="section-header">
            <h2>Simple, Transparent Pricing</h2>
            <p>Start free. Upgrade when you&apos;re ready to scale.</p>
          </div>

          <div className="pricing-billing-toggle">
            <button
              type="button"
              className={billingCycle === 'monthly' ? 'active' : ''}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={billingCycle === 'yearly' ? 'active' : ''}
              onClick={() => setBillingCycle('yearly')}
            >
              Yearly
              <span className="pricing-save-badge">Save ~17%</span>
            </button>
          </div>

          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>Free</h3>
              <div className="price">
                <strong>{formatInr(0)}</strong>
                <span className="price-period">forever</span>
              </div>
              <p className="pricing-tagline">Perfect to get started with your digital menu</p>
              <ul className="features-list">
                <li><Check size={16} /> Up to 10 dishes</li>
                <li><Check size={16} /> QR digital menu</li>
                <li><Check size={16} /> Realtime table ordering</li>
                <li><Check size={16} /> Review management</li>
                <li><Check size={16} /> Basic analytics</li>
              </ul>
              <Button variant="outline" className="full-width" onClick={handleCta}>
                {user ? 'Go to Dashboard' : 'Get Started Free'}
              </Button>
            </div>

            <div className="pricing-card highlighted">
              <div className="badge">Most Popular</div>
              <h3>Pro</h3>
              <div className="price">
                <strong>{proPrice.main}</strong>
                <span className="price-period">{proPrice.sub}</span>
              </div>
              {billingCycle === 'yearly' && (
                <p className="pricing-savings">
                  Save {formatInr(getYearlySavings('pro'))} vs monthly
                </p>
              )}
              <p className="pricing-tagline">{TRIAL_DAYS}-day free trial for new restaurants</p>
              <ul className="features-list">
                <li><Check size={16} /> Unlimited dishes</li>
                <li><Check size={16} /> AR dish previews</li>
                <li><Check size={16} /> Advanced analytics</li>
                <li><Check size={16} /> Realtime ordering</li>
                <li><Check size={16} /> QR menu &amp; reviews</li>
              </ul>
              <Button className="full-width" onClick={handleCta}>
                {user ? 'Go to Dashboard' : 'Start Free Trial'}
              </Button>
            </div>

            <div className="pricing-card">
              <h3>Premium</h3>
              <div className="price">
                <strong>{premiumPrice.main}</strong>
                <span className="price-period">{premiumPrice.sub}</span>
              </div>
              {billingCycle === 'yearly' && (
                <p className="pricing-savings">
                  Save {formatInr(getYearlySavings('premium'))} vs monthly
                </p>
              )}
              <p className="pricing-tagline">For brands that want a fully custom experience</p>
              <ul className="features-list">
                <li><Check size={16} /> Everything in Pro</li>
                <li><Check size={16} /> Premium AR features</li>
                <li><Check size={16} /> Custom branding</li>
                <li><Check size={16} /> Priority support</li>
                <li><Check size={16} /> Advanced analytics</li>
              </ul>
              <Button variant="outline" className="full-width" onClick={handleCta}>
                {user ? 'Go to Dashboard' : 'Get Started'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-container">
          <div className="footer-copyright">
            <p>&copy; {new Date().getFullYear()} RASTROmenu. All rights reserved.</p>
          </div>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
            <a href="/login">Login</a>
            <Button onClick={handleCta}>Get Started</Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

