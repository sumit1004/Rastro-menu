import React, { useState, useEffect } from 'react';
import paymentService from '../services/paymentService';
import Card from '../components/Card';
import Loader from '../components/Loader';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import './Dashboard.css';

const PaymentHistory = ({ embedded = false }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await paymentService.getHistory();
        setHistory(data);
      } catch (err) {
        setError('Failed to load payment history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <Loader />;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle size={18} className="text-green-500" />;
      case 'failed': return <XCircle size={18} className="text-red-500" />;
      case 'pending': return <Clock size={18} className="text-yellow-500" />;
      case 'cancelled': return <AlertCircle size={18} className="text-gray-500" />;
      default: return null;
    }
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className={embedded ? 'payment-history-embedded' : 'dashboard-content fade-in'}>
      {!embedded && (
        <header className="dashboard-header">
          <h1>Payment History</h1>
          <p>View your past transactions and subscription updates.</p>
        </header>
      )}

      {error ? (
        <div className="text-red-500">{error}</div>
      ) : history.length === 0 ? (
        <Card className="text-center p-8 mt-4 text-gray-500">
          No payment history found.
        </Card>
      ) : (
        <Card className="payment-history-card mt-4">
          <div className="payment-history-table-wrap">
            <table className="payment-history-table w-full text-left">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Plan</th>
                  <th>Cycle</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((payment, idx) => (
                  <tr key={idx}>
                    <td>{formatDate(payment.created_at)}</td>
                    <td className="capitalize">{payment.plan_name}</td>
                    <td className="capitalize text-gray-600">{payment.billing_cycle}</td>
                    <td className="font-semibold">₹{payment.amount}</td>
                    <td>
                      <div className="payment-status-cell capitalize">
                        {getStatusIcon(payment.payment_status)}
                        <span className={payment.payment_status === 'success' ? 'text-green-700 font-medium' : 'text-gray-600'}>
                          {payment.payment_status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="payment-history-cards">
            {history.map((payment, idx) => (
              <article key={idx} className="payment-history-mobile-card">
                <div className="payment-mobile-row">
                  <span className="payment-mobile-label">Date</span>
                  <span className="payment-mobile-value">{formatDate(payment.created_at)}</span>
                </div>
                <div className="payment-mobile-row">
                  <span className="payment-mobile-label">Plan</span>
                  <span className="payment-mobile-value capitalize">{payment.plan_name}</span>
                </div>
                <div className="payment-mobile-row">
                  <span className="payment-mobile-label">Cycle</span>
                  <span className="payment-mobile-value capitalize">{payment.billing_cycle}</span>
                </div>
                <div className="payment-mobile-row">
                  <span className="payment-mobile-label">Amount</span>
                  <span className="payment-mobile-value payment-mobile-amount">₹{payment.amount}</span>
                </div>
                <div className="payment-mobile-row payment-mobile-status">
                  <span className="payment-mobile-label">Status</span>
                  <span className={`payment-mobile-value capitalize ${payment.payment_status === 'success' ? 'text-green-700' : ''}`}>
                    {getStatusIcon(payment.payment_status)}
                    {payment.payment_status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PaymentHistory;
