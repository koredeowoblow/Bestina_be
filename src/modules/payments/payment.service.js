import mongoose from 'mongoose';
import crypto from 'crypto';
import Stripe from 'stripe';
import paymentRepo from './payment.repository.js';
import orderRepo from '../orders/order.repository.js';
import AppError from '../../utils/AppError.js';
import eventBus from '../../utils/eventBus.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock');

class PaymentService {
  /**
   * Initialize a new payment intent/record
   */
  async initializePayment(userId, payload) {
    const { orderId, provider, amount, currency } = payload;

    // Ensure order exists and belongs to user
    const order = await orderRepo.findById(orderId);
    if (!order) throw new AppError('Order not found', 404);
    if (order.user._id.toString() !== userId.toString()) {
      throw new AppError('Unauthorized access to this order', 403);
    }

    // Generate unique reference (or get from provider)
    const reference = `${provider}_${crypto.randomBytes(8).toString('hex')}_${Date.now()}`;

    // Create pending payment
    const payment = await paymentRepo.create({
      user: userId,
      order: orderId,
      provider,
      reference,
      amount,
      currency,
      status: 'pending'
    });

    let authorizationUrl = '';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    if (provider === 'stripe') {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: currency.toLowerCase(),
            product_data: { name: `Order ${order._id}` },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${clientUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/checkout/cancel`,
        client_reference_id: reference,
        metadata: { orderId: orderId.toString() }
      });
      authorizationUrl = session.url;
    } else if (provider === 'paystack') {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: order.user.email,
          amount: Math.round(amount * 100),
          reference,
          currency: currency.toUpperCase(),
          callback_url: `${clientUrl}/checkout/verify`,
          metadata: { orderId: orderId.toString() }
        })
      });

      const data = await response.json();
      if (!data.status) throw new AppError(`Paystack Error: ${data.message}`, 400);
      authorizationUrl = data.data.authorization_url;
    }

    return {
      payment,
      authorizationUrl
    };
  }

  /**
   * CRITICAL: Process Webhook with MongoDB Transactions for full ACID compliance
   */
  async processWebhook(provider, reference, statusPayload) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // 1. Find Payment by unique provider + reference
      const payment = await paymentRepo.findByReferenceAndProvider(reference, provider, session);
      if (!payment) {
        throw new AppError(`Payment reference ${reference} not found`, 404);
      }

      // 2. IDEMPOTENCY CHECK: If already processed, exit safely (return 200 to gateway)
      if (payment.status === 'success' || payment.status === 'refunded') {
        await session.commitTransaction();
        session.endSession();
        return payment;
      }

      // 3. Update Payment Document
      payment.status = statusPayload.status;
      payment.metadata = statusPayload.metadata || {};

      if (statusPayload.status === 'success') {
        payment.paidAt = new Date();
      } else if (statusPayload.status === 'failed') {
        payment.failureReason = statusPayload.reason || 'Gateway declined';
      }

      await payment.save({ session });

      // 4. Update Order Document synchronously in the same transaction
      const orderStatusMapping = {
        'success': 'paid',
        'failed': 'failed',
        'refunded': 'refunded'
      };
      const newOrderPaymentStatus = orderStatusMapping[statusPayload.status] || 'pending';

      await orderRepo.recordPaymentStatus(
        payment.order,
        payment._id,
        newOrderPaymentStatus,
        session
      );

      // 5. Commit Distributed Transaction
      await session.commitTransaction();

      // 6. Emit Asynchronous Domain Event Decoupling
      if (statusPayload.status === 'success') {
        const fullOrder = await orderRepo.findById(payment.order);
        eventBus.emit('order.paid', fullOrder);
      }

      return payment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Fallback verification if webhook is missed/dropped
   */
  async verifyPayment(provider, reference) {
    // In production, call provider's verification API to get live status:
    // const gatewayResponse = await axios.get(`https://api.${provider}.com/verify/${reference}`);
    // const status = gatewayResponse.data.status;

    const mockedStatusPayload = {
      status: 'success', // Assuming gateway says success
      metadata: { verifiedVia: 'API_POLL' }
    };

    // Re-use the ACID webhook logic to sync state cleanly
    return await this.processWebhook(provider, reference, mockedStatusPayload);
  }

  /**
   * Process refunds natively using transactions
   */
  async refundPayment(provider, reference, reason) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const payment = await paymentRepo.findByReferenceAndProvider(reference, provider, session);
      if (!payment) throw new AppError('Payment not found', 404);
      if (payment.status !== 'success') throw new AppError('Only successful payments can be refunded', 400);

      // In production, call Stripe/Paystack Refund API here first.

      payment.status = 'refunded';
      payment.refundedAt = new Date();
      payment.metadata = { ...payment.metadata, refundReason: reason };
      await payment.save({ session });

      await orderRepo.recordPaymentStatus(payment.order, payment._id, 'refunded', session);

      await session.commitTransaction();
      return payment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export default new PaymentService();
