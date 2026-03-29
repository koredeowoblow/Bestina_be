import stripe from 'stripe';
import config from '../../config/index.js';
import AppError from '../../utils/AppError.js';
(process.env.STRIPE_SECRET_KEY);



class StripeService {
  async createPaymentIntent(amount, currency = 'usd', orderId, userEmail) {
    if (!amount || amount <= 0) {
      throw new AppError('Invalid amount for payment intent', 400);
    }

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents
      currency,
      metadata: { orderId, userEmail }
    });

    return {
      clientSecret: intent.client_secret,
      intentId: intent.id
    };
  }

  async verifyWebhook(payload, signature) {
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        config.stripe.webhookSecret
      );
    } catch (err) {
      throw new AppError(`Webhook Error: ${err.message}`, 400);
    }

    return event;
  }
}

export default new StripeService();
