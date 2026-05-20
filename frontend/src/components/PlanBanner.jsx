import React, { useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import UpgradeModal from './UpgradeModal';
import { Zap, Crown, Shield, Clock, TrendingUp, Utensils } from 'lucide-react';
import './PlanBanner.css';

const PLAN_CONFIG = {
  free: {
    label: 'FREE',
    gradient: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
    accent: '#64748b',
    icon: <Shield size={20} />,
    tagline: 'Getting Started',
  },
  pro: {
    label: 'PRO',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    accent: '#4f46e5',
    icon: <Zap size={20} />,
    tagline: 'Growing Business',
  },
  premium: {
    label: 'PREMIUM',
    gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    accent: '#d97706',
    icon: <Crown size={20} />,
    tagline: 'Full Power',
  },
};

const UsageBar = ({ label, used, limit, icon }) => {
  const isUnlimited = limit === null || limit === undefined;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e';

  return (
    <div className="pb-usage-item">
      <div className="pb-usage-header">
        <span className="pb-usage-label">{icon} {label}</span>
        <span className="pb-usage-value" style={{ color: isUnlimited ? '#22c55e' : pct >= 80 ? color : '#475569' }}>
          {used} / {isUnlimited ? '∞ Unlimited' : limit}
        </span>
      </div>
      {!isUnlimited && (
        <div className="pb-progress-track">
          <div
            className="pb-progress-fill"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      )}
      {!isUnlimited && pct >= 80 && (
        <p className="pb-usage-warn" style={{ color }}>
          {pct >= 100 ? '⚠ Limit reached — upgrade to add more' : `⚠ ${100 - pct}% remaining`}
        </p>
      )}
    </div>
  );
};

const PlanBanner = () => {
  const { subscription, loading } = useSubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (loading || !subscription) return null;

  const { plan, status, billingCycle, planExpiry, usage, limits, trial } = subscription;
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.free;
  const isPremium = plan === 'premium';
  const isTrial = trial?.isActive;

  const formatDate = (d) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <>
      <div className="plan-banner" style={{ '--plan-gradient': config.gradient, '--plan-accent': config.accent }}>
        {/* Left: Plan identity */}
        <div className="pb-identity">
          <div className="pb-badge" style={{ background: config.gradient }}>
            {config.icon}
            <span>{config.label}</span>
          </div>
          <div className="pb-meta">
            <span className="pb-tagline">{config.tagline}</span>
            <div className="pb-details">
              {billingCycle && (
                <span className="pb-chip">{billingCycle === 'yearly' ? '🗓 Yearly' : '📅 Monthly'}</span>
              )}
              {planExpiry && (
                <span className="pb-chip">Renews {formatDate(planExpiry)}</span>
              )}
              {status === 'expired' && (
                <span className="pb-chip danger">⚠ Expired</span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Trial countdown */}
        {isTrial && (
          <div className="pb-trial">
            <div className="pb-trial-header">
              <Clock size={16} />
              <span><strong>{trial.daysLeft}</strong> days left in trial</span>
            </div>
            <div className="pb-progress-track" style={{ width: '160px' }}>
              <div
                className="pb-progress-fill"
                style={{ width: `${Math.max(5, (trial.daysLeft / 7) * 100)}%`, background: trial.daysLeft <= 2 ? '#ef4444' : '#f59e0b' }}
              />
            </div>
            <p className="pb-trial-sub">Access ends in {trial.daysLeft} days — upgrade to keep features.</p>
          </div>
        )}

        {/* Right: Usage stats */}
        <div className="pb-usage">
          <UsageBar
            label="Dishes"
            used={usage?.dishes ?? 0}
            limit={limits?.maxDishes}
            icon={<Utensils size={13} style={{ display: 'inline', marginRight: 4 }} />}
          />
          <UsageBar
            label="AI Generations"
            used={usage?.aiGenerations ?? 0}
            limit={limits?.aiGenerationsPerMonth}
            icon={<TrendingUp size={13} style={{ display: 'inline', marginRight: 4 }} />}
          />
        </div>

        {/* Upgrade CTA */}
        {!isPremium && (
          <div className="pb-cta">
            <button className="pb-upgrade-btn" onClick={() => setUpgradeOpen(true)}>
              <Crown size={15} />
              {plan === 'free' ? 'Upgrade to Pro' : 'Go Premium'}
            </button>
          </div>
        )}
      </div>

      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        preselectPlan={plan === 'pro' ? 'premium' : 'pro'}
      />
    </>
  );
};

export default PlanBanner;
