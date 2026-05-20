import api from './api';

const paymentService = {
  createOrder: async (plan_name, billing_cycle) => {
    const { data } = await api.post('/payments/create-order', {
      plan_name,
      billing_cycle
    });
    return data;
  },

  verifyPayment: async (verificationData) => {
    const { data } = await api.post('/payments/verify', verificationData);
    return data;
  },

  handleFailure: async (failureData) => {
    const { data } = await api.post('/payments/failure', failureData);
    return data;
  },

  getHistory: async () => {
    const { data } = await api.get('/payments/history');
    return data;
  }
};

export default paymentService;
