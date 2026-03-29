import crypto from 'crypto';
import config from '../../config/index.js';
import asyncWrapper from '../../utils/asyncWrapper.js';
import AppError from '../../utils/AppError.js';
import orderRepo from '../orders/order.repository.js'; // to update payment status

class PaystackController {
  initialize = asyncWrapper(async (req, res, next) => {
    // Mock initiation
    res.status(200).json({
      success: true,
      message: 'Paystack initialized',
      data: { authorization_url: 'https://checkout.paystack.com/...', reference: 'mock_ref_' + Date.now() }
    });
  });

  verify = asyncWrapper(async (req, res, next) => {
    // Sync fallback update logic mock
    res.status(200).json({
      success: true,
      message: 'Payment verified manually',
      data: null
    });
  });

  webhook = asyncWrapper(async (req, res, next) => {
    const hash = crypto.createHmac('sha512', config.paystack.secretKey)
      .update(JSON.stringify(req.body)).digest('hex');

    const paystackSig = req.headers['x-paystack-signature'];
    if (hash !== paystackSig) {
      return next(new AppError('Invalid Paystack signature', 400));
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const metadata = event.data.metadata;
      // We would extract orderId from metadata and update via orderRepo idempotently
      if (metadata && metadata.orderId) {
        const order = await orderRepo.findById(metadata.orderId);
        if (order && order.paymentStatus !== 'paid') {
          await orderRepo.updatePayment(order._id, 'paid', reference);
          // Additional clear cart and email logic goes here
        }
      }
    }

    res.status(200).send('Webhook successfully received');
  });
}


export default new PaystackController();
