import React, { useState, useEffect, useContext } from 'react';
import './UpgradeModal.css';
import Button from './Button';
import paymentService from '../services/paymentService';
import { AuthContext } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { ShieldCheck, CheckCircle, Sparkles } from 'lucide-react';

const PRICING = {
  pro: { monthly: 499, yearly: 4999 },
  premium: { monthly: 999, yearly: 9999 }
};

const UpgradeModal = ({ isOpen, onClose, featureName, message, limitReached, preselectPlan = 'pro' }) => {
  const { verifyToken } = useContext(AuthContext);
  const { refresh: refreshSubscription } = useSubscription();
  const [billingCycle, setBillingCycle] = useState('yearly');
  const [selectedPlan, setSelectedPlan] = useState(preselectPlan);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Dynamically load Razorpay script
    const loadRazorpayScript = () => {
      if (!document.getElementById('razorpay-checkout-js')) {
        const script = document.createElement('script');
        script.id = 'razorpay-checkout-js';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
      }
    };
    loadRazorpayScript();
  }, []);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    setError(null);
    setProcessing(true);

    try {
      // 1. Create order on backend
      const order = await paymentService.createOrder(selectedPlan, billingCycle);

      // 2. Initialize Razorpay
      const options = {
        key: order.key_id, // Safely provided by backend
        amount: order.amount * 100, // paise
        currency: order.currency,
        name: 'RASTRO-menu',
        description: `Upgrade to ${selectedPlan.toUpperCase()} (${billingCycle})`,
        order_id: order.order_id,
        handler: async function (response) {
          try {
            setProcessing(true);
            // 3. Send verification to backend
            const verificationData = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            };
            await paymentService.verifyPayment(verificationData);
            
            // 4. Show success state and refresh all global state
            setPaymentSuccess(true);
            await verifyToken(); // Refresh auth/user context
            refreshSubscription(); // Refresh subscription context → updates PlanBanner, Sidebar, etc.
          } catch (err) {
            setError(err.response?.data?.message || 'Payment verification failed');
          } finally {
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: async function () {
            setProcessing(false);
            // Log failure to backend if closed
            await paymentService.handleFailure({
              razorpay_order_id: order.order_id,
              reason: 'User closed the checkout popup'
            });
          }
        },
        theme: {
          color: '#4f46e5'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', async function (response) {
        setError('Payment failed. Please try again.');
        await paymentService.handleFailure({
          razorpay_order_id: response.error.metadata.order_id,
          reason: response.error.description
        });
      });
      rzp.open();

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initialize payment');
      setProcessing(false);
    }
  };

  const amount = selectedPlan === 'free' ? 0 : PRICING[selectedPlan][billingCycle];
  const monthlyEquivalent = selectedPlan === 'free' ? 0 : (billingCycle === 'yearly' ? Math.round(amount / 12) : amount);
  const savings = selectedPlan === 'free' ? 0 : (billingCycle === 'yearly' ? (PRICING[selectedPlan].monthly * 12) - amount : 0);

  return (
    <div className="upgrade-modal-overlay fade-in">
      <div className={`upgrade-modal-content premium-glow ${paymentSuccess ? 'success-mode' : ''}`}>
        {!paymentSuccess && <button className="upgrade-modal-close" onClick={onClose} disabled={processing}>&times;</button>}
        
        {paymentSuccess ? (
          <div className="payment-success-content text-center">
            <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
            <h2>Payment Successful!</h2>
            <p>Your subscription has been activated successfully. All premium features are now unlocked.</p>
            <Button onClick={onClose} className="mt-4">Continue to Dashboard</Button>
          </div>
        ) : (
          <>
            <div className="upgrade-modal-header text-center">
              <Sparkles size={32} className="mx-auto text-yellow-500 mb-2" />
              <h2 className="upgrade-modal-title">
                {limitReached ? 'Limit Reached' : `Unlock ${featureName || 'Premium Features'}`}
              </h2>
              <p className="upgrade-modal-desc">
                {message || 'Upgrade your plan to access premium features and scale your restaurant.'}
              </p>
            </div>

            <div className="billing-toggle-container">
              <div className="billing-toggle">
                <button 
                  className={billingCycle === 'monthly' ? 'active' : ''} 
                  onClick={() => setBillingCycle('monthly')}
                >
                  Monthly
                </button>
                <button 
                  className={billingCycle === 'yearly' ? 'active' : ''} 
                  onClick={() => setBillingCycle('yearly')}
                >
                  Yearly <span className="save-badge">Save 16%</span>
                </button>
              </div>
            </div>

            <div className="plan-selector">
              <div 
                className={`plan-option ${selectedPlan === 'free' ? 'selected' : ''}`} 
                onClick={() => setSelectedPlan('free')}
              >
                <h4>Free</h4>
                <div className="price">₹0<span className="period">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span></div>
              </div>
              <div 
                className={`plan-option ${selectedPlan === 'pro' ? 'selected' : ''}`} 
                onClick={() => setSelectedPlan('pro')}
              >
                <h4>Pro</h4>
                <div className="price">₹{PRICING.pro[billingCycle]}<span className="period">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span></div>
              </div>
              <div 
                className={`plan-option ${selectedPlan === 'premium' ? 'selected' : ''}`} 
                onClick={() => setSelectedPlan('premium')}
              >
                <h4>Premium</h4>
                <div className="price">₹{PRICING.premium[billingCycle]}<span className="period">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span></div>
              </div>
            </div>
            
            <div className="upgrade-benefits">
              <ul>
                {selectedPlan === 'free' && (
                  <>
                    <li><span className="check" style={{background: '#94a3b8'}}>✓</span> Up to 10 Dishes</li>
                    <li><span className="check" style={{background: '#94a3b8'}}>✓</span> 5 AI Menu Generations</li>
                    <li><span className="check" style={{background: '#94a3b8'}}>✓</span> Basic Analytics</li>
                  </>
                )}
                {selectedPlan === 'pro' && (
                  <>
                    <li><span className="check">✓</span> Unlimited Dishes</li>
                    <li><span className="check">✓</span> 100 AI Menu Generations</li>
                    <li><span className="check">✓</span> Advanced Analytics Dashboard</li>
                  </>
                )}
                {selectedPlan === 'premium' && (
                  <>
                    <li><span className="check">✓</span> Unlimited Dishes</li>
                    <li><span className="check">✓</span> Unlimited AI Menu Generations</li>
                    <li><span className="check">✓</span> Advanced Analytics Dashboard</li>
                    <li><span className="check">✓</span> Custom Branding & Priority Support</li>
                  </>
                )}
              </ul>
            </div>

            {selectedPlan !== 'free' && (
              <div className="billing-summary">
                <div className="summary-row">
                  <span>Billed {billingCycle}:</span>
                  <span className="font-bold">₹{amount}</span>
                </div>
                {billingCycle === 'yearly' && (
                  <div className="summary-row text-green-600 font-medium">
                    <span>Savings compared to monthly:</span>
                    <span>₹{savings}/year</span>
                  </div>
                )}
              </div>
            )}

            {error && <div className="upgrade-error text-red-500 text-sm my-2 text-center">{error}</div>}

            <div className="upgrade-modal-actions mt-4">
              {selectedPlan === 'free' ? (
                <Button onClick={onClose} variant="secondary" className="w-full">
                  Stay on Free
                </Button>
              ) : (
                <Button onClick={handleCheckout} loading={processing} className="w-full upgrade-btn-primary flex items-center justify-center gap-2">
                  <ShieldCheck size={18} /> {processing ? 'Processing...' : `Pay ₹${amount} Securely`}
                </Button>
              )}
            </div>
            <div className="secure-badge text-center text-xs text-gray-500 mt-2 flex items-center justify-center gap-1">
               Secured by Razorpay
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpgradeModal;
