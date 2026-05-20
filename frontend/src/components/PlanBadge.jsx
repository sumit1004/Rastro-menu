import React from 'react';
import './PlanBadge.css';

const PlanBadge = ({ plan, status }) => {
  if (!plan) return null;
  const isTrial = status === 'trial';
  
  return (
    <span className={`plan-badge badge-${plan.toLowerCase()} ${isTrial ? 'badge-trial' : ''}`}>
      {plan.toUpperCase()} {isTrial && '(TRIAL)'}
    </span>
  );
};

export default PlanBadge;
