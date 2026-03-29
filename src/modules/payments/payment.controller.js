import crypto from 'crypto';
import paymentService from './payment.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';
import AppError from '../../utils/AppError.js';

class PaymentController {
  
  initialize = asyncWrapper(async (req, res, next) => {
    const payload = req.body;
    const result = await paymentService.initializePayment(req.user._id, payload);
    
    res.status(200).json({
      success: true,
      message: 'Payment initialized successfully',
      data: result
    });
  });

  verify = asyncWrapper(async (req, res, next) => {
    const { provider, reference } = req.params;
    const payment = await paymentService.verifyPayment(provider, reference);
    
    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: payment
    });
  });

  refund = asyncWrapper(async (req, res, next) => {
    const { provider, reference, reason } = req.body;
    const payment = await paymentService.refundPayment(provider, reference, reason);
    
    res.status(200).json({
      success: true,
      message: 'Payment refunded successfully',
      data: payment
    });
  });

  /**
   * Webhook specific to Paystack (HMAC SHA512 signature validation)
   */
  paystackWebhook = asyncWrapper(async (req, res, next) => {
    const signature = req.headers['x-paystack-signature'];
    const secret = process.env.PAYSTACK_SECRET_KEY || 'default_secret';
    
    const hash = crypto
      .createHmac('sha512', secret)
      .update(req.rawBody)
      .digest('hex');
    
    if (hash !== signature) {
      return next(new AppError('Invalid webhook signature', 400));
    }

    const event = req.body;
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      await paymentService.processWebhook('paystack', reference, {
        status: 'success',
        metadata: event.data
      });
    }

    // Always acknowledge receipt to provider promptly
    res.status(200).send('Webhook acknowledged');
  });

  /**
   * Webhook specific to Stripe (HMAC SHA256 signature validation via Stripe SDK)
   */
  stripeWebhook = asyncWrapper(async (req, res, next) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
      const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);
      event = stripe.webhooks.constructEvent(req.rawBody, signature, secret);
    } catch (err) {
      return next(new AppError(`Webhook Error: ${err.message}`, 400));
    }

    if (event.type === 'payment_intent.succeeded') {
      const reference = event.data.object.id; // Stripe PaymentIntent ID
      await paymentService.processWebhook('stripe', reference, {
        status: 'success',
        metadata: event.data.object
      });
    } else if (event.type === 'payment_intent.payment_failed') {
      const reference = event.data.object.id;
      await paymentService.processWebhook('stripe', reference, {
        status: 'failed',
        reason: event.data.object.last_payment_error?.message,
        metadata: event.data.object
      });
    }

    res.status(200).send('Webhook acknowledged');
  });
}

export default new PaymentController();
