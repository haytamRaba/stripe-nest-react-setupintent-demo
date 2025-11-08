import {
  Controller,
  Post,
  Headers,
  RawBodyRequest,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeService, PaymentMethodRecord } from './stripe.service'; 

@Controller('api/stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  /**
   * POST /api/stripe/setup-intent
   * Create a new SetupIntent for collecting card information
   */
  @Post('setup-intent')
  async createSetupIntent() {
    try {
      return await this.stripeService.createSetupIntent();
    } catch (error) {
      console.error('[Stripe] Error in setup-intent endpoint:', error);
      throw new HttpException(
        'Failed to create SetupIntent',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/stripe/webhook
   * Receive webhook events from Stripe
   */
  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    try {
      const rawBody = req.rawBody || Buffer.from(''); // ✅ ensure it's always a Buffer

      // ✅ Cast rawBody as Buffer to satisfy Stripe typing
      const event = this.stripeService.verifyWebhookSignature(
        rawBody as Buffer,
        signature,
      );

      if (!event) {
        console.warn('[Stripe] Webhook verification failed');
        throw new HttpException(
          'Webhook Error: Invalid signature',
          HttpStatus.BAD_REQUEST,
        );
      }

      console.log('[Stripe] Webhook event received:', event.type);

      if (event.type === 'setup_intent.succeeded') {
        const setupIntent = event.data.object as any;
        this.stripeService.handleSetupIntentSucceeded(setupIntent);
      }

      return { received: true };
    } catch (error) {
      console.error('[Stripe] Webhook error:', error);
      throw new HttpException(
        'Webhook processing failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/stripe/payment-methods
   * Get all saved payment methods (demo only)
   */
  @Post('payment-methods')
  getPaymentMethods(): { paymentMethods: PaymentMethodRecord[]; count: number } { // ✅ explicit type
    const paymentMethods = this.stripeService.getSavedPaymentMethods();
    return {
      paymentMethods,
      count: paymentMethods.length,
    };
  }
}
