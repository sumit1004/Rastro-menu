import React, { useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import UpgradeModal from './UpgradeModal';
import {
  Check, Lock, Infinity as InfinityIcon,
  Utensils, BrainCircuit, BarChart2, Palette, HeadphonesIcon, QrCode, Star, Tag
} from 'lucide-react';

const FEATURES = [
  {
    key: 'unlimitedDishes',
    icon: <Utensils size={20} />,
    label: 'Unlimited Dishes',
    lockedLabel: 'Up to 10 dishes only',
    description: 'Add as many dishes as you want with no restrictions.',
    lockedFor: 'free',
  },
  {
    key: 'aiAccess',
    icon: <BrainCircuit size={20} />,
    label: 'AI Menu Autofill',
    lockedLabel: 'AI not available',
    description: 'Auto-generate dish descriptions, categories, and tags using AI.',
    lockedFor: null,
  },
  {
    key: 'unlimitedAi',
    icon: <BrainCircuit size={20} />,
    label: 'Unlimited AI Generations',
    lockedLabel: '5 generations/month',
    description: 'Generate unlimited AI descriptions with no monthly cap.',
    lockedFor: 'free',
  },
  {
    key: 'advancedAnalytics',
    icon: <BarChart2 size={20} />,
    label: 'Advanced Analytics',
    lockedLabel: 'Basic analytics only',
    description: 'Deep insights into customer behavior, search trends, and traffic.',
    lockedFor: 'free',
  },
  {
    key: 'multipleCategories',
    icon: <Tag size={20} />,
    label: 'Multiple Menu Categories',
    lockedLabel: 'Limited categories',
    description: 'Organize your menu with unlimited custom categories.',
    lockedFor: 'free',
  },
  {
    key: 'qrMenuDownload',
    icon: <QrCode size={20} />,
    label: 'QR Menu & Download',
    lockedLabel: 'QR Menu',
    description: 'Generate and download your custom QR code for table placement.',
    lockedFor: null,
  },
  {
    key: 'customBranding',
    icon: <Palette size={20} />,
    label: 'Custom Branding',
    lockedLabel: 'Default branding',
    description: 'Custom colors, fonts, and remove Rastro branding.',
    lockedFor: ['free', 'pro'],
  },
  {
    key: 'prioritySupport',
    icon: <HeadphonesIcon size={20} />,
    label: 'Priority Support',
    lockedLabel: 'Standard support',
    description: '24/7 dedicated support with faster response times.',
    lockedFor: ['free', 'pro'],
  },
  {
    key: 'reviewManagement',
    icon: <Star size={20} />,
    label: 'Review Management',
    lockedLabel: 'Review management',
    description: 'Monitor and respond to customer dish reviews.',
    lockedFor: null,
  },
];

const FeatureGrid = ({ compact = false }) => {
  const { subscription } = useSubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (!subscription) return null;

  const { plan, features } = subscription;

  const isLocked = (feature) => {
    if (!features) return false;
    if (feature.key && features[feature.key] === false) return true;
    if (Array.isArray(feature.lockedFor)) return feature.lockedFor.includes(plan);
    if (typeof feature.lockedFor === 'string') return feature.lockedFor === plan;
    return false;
  };

  const displayFeatures = compact ? FEATURES.slice(0, 6) : FEATURES;

  return (
    <>
      <div className={`feature-grid ${compact ? 'feature-grid-compact' : ''}`}>
        {displayFeatures.map((feat) => {
          const locked = isLocked(feat);
          return (
            <div
              key={feat.key}
              className={`feature-card ${locked ? 'feature-locked' : 'feature-unlocked'}`}
              title={locked ? `Upgrade to unlock: ${feat.description}` : feat.description}
            >
              <div className={`feature-icon-wrap ${locked ? 'locked' : 'unlocked'}`}>
                {feat.icon}
              </div>
              <div className="feature-content">
                <span className="feature-name">{locked ? feat.lockedLabel || feat.label : feat.label}</span>
                <span className="feature-desc">{locked ? 'Upgrade to unlock' : feat.description}</span>
              </div>
              <div className="feature-status">
                {locked ? (
                  <Lock size={16} className="feature-lock-icon" />
                ) : (
                  <Check size={16} className="feature-check-icon" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {plan !== 'premium' && (
        <div className="feature-upgrade-cta">
          <p>
            {plan === 'free'
              ? '🔒 Unlock 5 more features by upgrading to Pro or Premium'
              : '🔒 Unlock custom branding & priority support with Premium'}
          </p>
          <button className="feature-upgrade-btn" onClick={() => setUpgradeOpen(true)}>
            Upgrade Now →
          </button>
        </div>
      )}

      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        preselectPlan={plan === 'pro' ? 'premium' : 'pro'}
      />

      <style>{`
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 0.75rem;
          margin: 1rem 0;
        }
        .feature-grid-compact {
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        }
        .feature-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          background: white;
          transition: box-shadow 0.2s ease;
        }
        .feature-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.07); }
        .feature-locked { background: #f8fafc; opacity: 0.8; }
        .feature-icon-wrap {
          width: 36px; height: 36px;
          border-radius: 0.5rem;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .feature-icon-wrap.unlocked { background: #dcfce7; color: #16a34a; }
        .feature-icon-wrap.locked { background: #f1f5f9; color: #94a3b8; }
        .feature-content { flex: 1; min-width: 0; }
        .feature-name { display: block; font-size: 0.85rem; font-weight: 600; color: #1e293b; }
        .feature-locked .feature-name { color: #64748b; }
        .feature-desc { display: block; font-size: 0.72rem; color: #94a3b8; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .feature-status { flex-shrink: 0; }
        .feature-check-icon { color: #22c55e; }
        .feature-lock-icon { color: #cbd5e1; }
        .feature-upgrade-cta {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.85rem 1.25rem;
          background: linear-gradient(135deg, #eff6ff, #f5f3ff);
          border: 1px solid #c7d2fe;
          border-radius: 0.75rem;
          margin-top: 0.75rem;
          flex-wrap: wrap; gap: 0.75rem;
        }
        .feature-upgrade-cta p { margin: 0; font-size: 0.85rem; color: #3730a3; font-weight: 500; }
        .feature-upgrade-btn {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          color: white; border: none;
          padding: 0.5rem 1.25rem;
          border-radius: 0.5rem; font-size: 0.85rem; font-weight: 700;
          cursor: pointer; transition: opacity 0.2s;
        }
        .feature-upgrade-btn:hover { opacity: 0.9; }
        @media (max-width: 600px) {
          .feature-upgrade-cta { flex-direction: column; }
          .feature-upgrade-btn { width: 100%; text-align: center; }
        }
      `}</style>
    </>
  );
};

export default FeatureGrid;
