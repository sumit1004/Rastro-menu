import React, { useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import UpgradeModal from '../components/UpgradeModal';
import FeatureGrid from '../components/FeatureGrid';
import PaymentHistory from './PaymentHistory';
import { Crown, Zap, Shield, Check, CreditCard, BarChart2, Package } from 'lucide-react';
import './Settings.css';

const PLAN_COLORS = {
  free: { bg: 'linear-gradient(135deg, #64748b, #94a3b8)', text: '#64748b', icon: <Shield size={18} /> },
  pro: { bg: 'linear-gradient(135deg, #4f46e5, #7c3aed)', text: '#4f46e5', icon: <Zap size={18} /> },
  premium: { bg: 'linear-gradient(135deg, #d97706, #f59e0b)', text: '#d97706', icon: <Crown size={18} /> },
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
};

const UsageBar = ({ label, used, limit }) => {
  const isUnlimited = limit === null || limit === undefined;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#4f46e5';

  return (
    <div className="s-usage-bar">
      <div className="s-usage-header">
        <span>{label}</span>
        <span className="s-usage-val" style={{ color: isUnlimited ? '#22c55e' : pct >= 80 ? color : '#475569' }}>
          {used} / {isUnlimited ? '∞' : limit}
          {isUnlimited && <span className="s-unlimited-badge">Unlimited</span>}
        </span>
      </div>
      {!isUnlimited && (
        <>
          <div className="s-progress-track">
            <div className="s-progress-fill" style={{ width: `${pct}%`, background: color }} />
          </div>
          {pct >= 80 && (
            <p className="s-usage-warn" style={{ color }}>
              {pct >= 100 ? '⚠ Limit reached — upgrade to continue' : `${100 - pct}% remaining this month`}
            </p>
          )}
        </>
      )}
    </div>
  );
};

const CompareTable = ({ onUpgrade }) => {
  const plans = [
    {
      name: 'Free',
      price: '₹0',
      color: '#64748b',
      features: [
        'Up to 10 Dishes',
        '5 AI Generations / month',
        'Basic Analytics',
        'QR Menu',
        'Review Management',
        '—',
        '—',
        '—',
      ],
    },
    {
      name: 'Pro',
      price: '₹499/mo',
      color: '#4f46e5',
      popular: true,
      features: [
        'Unlimited Dishes',
        '100 AI Generations / month',
        'Advanced Analytics',
        'QR Menu',
        'Review Management',
        'Multiple Categories',
        '—',
        '—',
      ],
    },
    {
      name: 'Premium',
      price: '₹999/mo',
      color: '#d97706',
      features: [
        'Unlimited Dishes',
        'Unlimited AI Generations',
        'Advanced Analytics',
        'QR Menu',
        'Review Management',
        'Multiple Categories',
        'Custom Branding',
        'Priority Support',
      ],
    },
  ];

  const rows = [
    'Dishes', 'AI Generations', 'Analytics', 'QR Menu',
    'Review Management', 'Multiple Categories', 'Custom Branding', 'Priority Support',
  ];

  return (
    <div className="compare-wrap">
      <div className="compare-table">
        {/* Header */}
        <div className="compare-header-row">
          <div className="compare-feature-col" />
          {plans.map(p => (
            <div key={p.name} className="compare-plan-col" style={{ borderTop: `3px solid ${p.color}` }}>
              {p.popular && <div className="compare-popular">Most Popular</div>}
              <div className="compare-plan-name" style={{ color: p.color }}>{p.name}</div>
              <div className="compare-plan-price">{p.price}</div>
              {p.name !== 'Free' && (
                <button className="compare-select-btn" style={{ background: p.color }} onClick={onUpgrade}>
                  Select {p.name}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Rows */}
        {rows.map((row, i) => (
          <div key={row} className="compare-row">
            <div className="compare-feature-col">{row}</div>
            {plans.map(p => (
              <div key={p.name} className="compare-plan-col compare-cell">
                {p.features[i] === '—' ? (
                  <span className="compare-no">—</span>
                ) : (
                  <span className="compare-yes">
                    <Check size={14} /> {p.features[i]}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const Settings = () => {
  const { subscription, loading } = useSubscription();
  const [activeTab, setActiveTab] = useState('plan');
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (loading) return <div className="settings-loading"><div className="settings-spinner" />Loading...</div>;
  if (!subscription) return <div className="settings-error">Could not load subscription data.</div>;

  const { plan, status, billingCycle, planExpiry, usage, limits, trial } = subscription;
  const config = PLAN_COLORS[plan] || PLAN_COLORS.free;
  const isTrial = trial?.isActive;
  const isPremium = plan === 'premium';

  const TABS = [
    { id: 'plan', label: 'Your Plan', icon: <Package size={16} /> },
    { id: 'compare', label: 'Compare Plans', icon: <BarChart2 size={16} /> },
    { id: 'billing', label: 'Payment History', icon: <CreditCard size={16} /> },
  ];

  return (
    <div className="settings-page">
      <header className="settings-page-header">
        <div>
          <h1>Subscription & Billing</h1>
          <p>Manage your plan, usage, and payment history.</p>
        </div>
        {!isPremium && (
          <button className="settings-upgrade-btn" onClick={() => setUpgradeOpen(true)}>
            <Crown size={16} /> {plan === 'free' ? 'Upgrade to Pro' : 'Go Premium'}
          </button>
        )}
      </header>

      {/* Tab Navigation */}
      <div className="settings-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* YOUR PLAN TAB */}
      {activeTab === 'plan' && (
        <div className="settings-plan-content">
          {/* Plan Hero Card */}
          <div className="s-plan-hero" style={{ background: config.bg }}>
            <div className="s-plan-hero-badge">
              {config.icon}
              <span>{plan.toUpperCase()}</span>
            </div>
            <div className="s-plan-hero-info">
              {billingCycle && (
                <span className="s-chip white">{billingCycle === 'yearly' ? '🗓 Yearly Billing' : '📅 Monthly Billing'}</span>
              )}
              {planExpiry && (
                <span className="s-chip white">Renews {formatDate(planExpiry)}</span>
              )}
              {isTrial && trial.daysLeft !== null && (
                <span className="s-chip trial-warn">
                  ⏰ {trial.daysLeft} day{trial.daysLeft !== 1 ? 's' : ''} left in trial
                </span>
              )}
              {status === 'expired' && <span className="s-chip red">⚠ Plan Expired</span>}
            </div>
          </div>

          {/* Trial Banner */}
          {isTrial && (
            <div className="s-trial-banner">
              <div>
                <strong>⏰ {trial.daysLeft} days left in your trial</strong>
                <p>After expiry, access to premium features will be revoked. Upgrade now to keep them.</p>
              </div>
              <button className="s-trial-upgrade-btn" onClick={() => setUpgradeOpen(true)}>
                Upgrade Now
              </button>
            </div>
          )}

          {/* Usage Section */}
          <div className="s-section">
            <h3>Usage This Month</h3>
            <div className="s-usage-grid">
              <UsageBar label="Dishes" used={usage?.dishes ?? 0} limit={limits?.maxDishes} />
              <UsageBar label="AI Generations" used={usage?.aiGenerations ?? 0} limit={limits?.aiGenerationsPerMonth} />
            </div>
          </div>

          {/* Feature Access */}
          <div className="s-section">
            <h3>Feature Access</h3>
            <FeatureGrid />
          </div>
        </div>
      )}

      {/* COMPARE TAB */}
      {activeTab === 'compare' && (
        <div className="s-section">
          <CompareTable onUpgrade={() => setUpgradeOpen(true)} />
        </div>
      )}

      {/* BILLING HISTORY TAB */}
      {activeTab === 'billing' && (
        <div className="s-section">
          <PaymentHistory embedded />
        </div>
      )}

      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        preselectPlan={plan === 'pro' ? 'premium' : 'pro'}
      />
    </div>
  );
};

export default Settings;
