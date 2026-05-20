import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';

const Legal = () => {
  const location = useLocation();
  const path = location.pathname.split('/').pop();
  
  const getTitle = () => {
    switch(path) {
      case 'privacy': return 'Privacy Policy';
      case 'terms': return 'Terms & Conditions';
      case 'refunds': return 'Refund Policy';
      case 'contact': return 'Contact Us';
      default: return 'Legal Information';
    }
  };

  const getContent = () => {
    switch(path) {
      case 'privacy':
        return (
          <>
            <h2>1. Information Collection</h2>
            <p>We collect information you provide directly to us when you create an account, subscribe to our service, or interact with our platform.</p>
            <h2>2. Use of Information</h2>
            <p>We use the information we collect to provide, maintain, and improve our services, process transactions, and send related information including confirmations and receipts.</p>
            <h2>3. Information Sharing</h2>
            <p>We do not share your personal information with third parties except as described in this privacy policy or with your consent.</p>
          </>
        );
      case 'terms':
        return (
          <>
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing and using RASTRO-menu, you accept and agree to be bound by the terms and provision of this agreement.</p>
            <h2>2. Description of Service</h2>
            <p>RASTRO-menu provides SaaS tools for restaurants to manage digital menus, analyze traffic, and optimize offerings using AI.</p>
            <h2>3. Subscription and Billing</h2>
            <p>Subscription fees are billed in advance on a recurring and periodic basis (Billing Cycle). Billing cycles are set on a regular basis, typically monthly or yearly.</p>
          </>
        );
      case 'refunds':
        return (
          <>
            <h2>1. Refund Policy</h2>
            <p>We offer a 7-day money-back guarantee for all our premium and pro plans. If you are not satisfied with our service, you can request a full refund within 7 days of your initial purchase.</p>
            <h2>2. Cancellations</h2>
            <p>You can cancel your subscription at any time. Your cancellation will take effect at the end of the current paid term. There are no refunds or credits for partially used billing periods.</p>
          </>
        );
      case 'contact':
        return (
          <>
            <h2>Contact Information</h2>
            <p>If you have any questions or concerns about our services, please contact us at:</p>
            <ul>
              <li><strong>Email:</strong> support@rastro-menu.com</li>
              <li><strong>Phone:</strong> +91 98765 43210</li>
              <li><strong>Address:</strong> 123 Tech Park, Bangalore, India</li>
            </ul>
          </>
        );
      default:
        return <p>Select a legal document to view.</p>;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '4rem 2rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'white', padding: '3rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', color: '#0f172a' }}>{getTitle()}</h1>
          <div style={{ color: '#334155', lineHeight: '1.6' }}>
            {getContent()}
          </div>
          <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
            <Link to="/legal/terms" style={{ color: '#4f46e5', textDecoration: 'none' }}>Terms</Link>
            <Link to="/legal/privacy" style={{ color: '#4f46e5', textDecoration: 'none' }}>Privacy</Link>
            <Link to="/legal/refunds" style={{ color: '#4f46e5', textDecoration: 'none' }}>Refunds</Link>
            <Link to="/legal/contact" style={{ color: '#4f46e5', textDecoration: 'none' }}>Contact</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Legal;
