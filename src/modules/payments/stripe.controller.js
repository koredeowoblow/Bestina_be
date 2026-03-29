import stripeService from './stripe.service.js';
import asyncWrapper from '../../utils/asyncWrapper.js';

class StripeController {
  createIntent = asyncWrapper(async (req, res, next) => {
    const { amount, currency, orderId } = req.body;
    const userEmail = req.user.email; // Requires protected route

    const data = await stripeService.createPaymentIntent(amount, currency, orderId, userEmail);

    res.status(200).json({
      success: true,
      message: 'Payment intent created successfully',
      data
    });
  });

  handleWebhook = asyncWrapper(async (req, res, next) => {
    const signature = req.headers['stripe-signature'];
    const event = await stripeService.verifyWebhook(req.body, signature);

    // Handle the event (e.g., successful payment updates the order status)
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent for ${paymentIntent.amount} was successful! Order: ${paymentIntent.metadata.orderId}`);
        // TODO: Update the Order status via OrderService/Repository here
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Acknowledge receipt of the event
    res.json({ received: true });
  });
}


export default new StripeController();
