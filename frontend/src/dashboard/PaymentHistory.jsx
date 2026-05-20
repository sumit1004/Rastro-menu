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

  return (
    <div className={embedded ? '' : 'dashboard-content fade-in'}>
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
        <Card className="mt-4 overflow-hidden">
          <table className="w-full text-left" style={{ minWidth: '600px' }}>
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-color)', backgroundColor: '#f8fafc' }}>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase">Date</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase">Plan</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase">Cycle</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase">Amount</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((payment, idx) => (
                <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors" style={{ borderColor: '#f1f5f9' }}>
                  <td className="p-4 text-gray-800">
                    {new Date(payment.created_at).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="p-4 font-medium" style={{ textTransform: 'capitalize' }}>
                    {payment.plan_name}
                  </td>
                  <td className="p-4 text-gray-600" style={{ textTransform: 'capitalize' }}>
                    {payment.billing_cycle}
                  </td>
                  <td className="p-4 font-semibold text-gray-900">
                    ₹{payment.amount}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2" style={{ textTransform: 'capitalize' }}>
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
        </Card>
      )}
    </div>
  );
};

export default PaymentHistory;
