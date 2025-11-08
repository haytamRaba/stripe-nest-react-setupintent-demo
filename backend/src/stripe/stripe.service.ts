import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

export interface PaymentMethodRecord {
  id: string;
  setupIntentId: string;
  paymentMethodId: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private paymentMethods: PaymentMethodRecord[] = [];

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.warn('[Stripe] STRIPE_SECRET_KEY not found in environment variables');
    }
    this.stripe = new Stripe(secretKey || '', {
      apiVersion: '2023-10-16', 
    });
  }

  /**
   * Create a SetupIntent for collecting card information
   */
  async createSetupIntent(): Promise<{
    clientSecret: string;
    setupIntentId: string;
  }> {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        payment_method_types: ['card'],
        usage: 'off_session',
      });

      console.log('[Stripe] SetupIntent created:', setupIntent.id);

      return {
        clientSecret: setupIntent.client_secret || '',
        setupIntentId: setupIntent.id,
      };
    } catch (error) {
      console.error('[Stripe] Error creating SetupIntent:', error);
      throw new Error('Failed to create SetupIntent');
    }
  }

  /**
   * Handle setup_intent.succeeded webhook event
   */
  handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent): void {
    try {
      const paymentMethodId = setupIntent.payment_method as string;

      const record: PaymentMethodRecord = {
        id: `pm_${Date.now()}`,
        setupIntentId: setupIntent.id,
        paymentMethodId: paymentMethodId,
        status: setupIntent.status,
        createdAt: new Date(),
      };

      this.paymentMethods.push(record);

      console.log(
        '[Stripe] Payment method saved:',
        paymentMethodId,
        'for SetupIntent:',
        setupIntent.id,
      );
      console.log('[Stripe] Total saved payment methods:', this.paymentMethods.length);
    } catch (error) {
      console.error('[Stripe] Error handling setup_intent.succeeded:', error);
    }
  }

  /**
   * Get all saved payment methods (demo purposes)
   */
  getSavedPaymentMethods(): PaymentMethodRecord[] {
    return this.paymentMethods;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    body: string | Buffer, // ✅ accept Buffer directly
    signature: string,
  ): Stripe.Event | null {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('[Stripe] STRIPE_WEBHOOK_SECRET not found');
      return null;
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        body, // ✅ can now pass a Buffer from controller
        signature,
        webhookSecret,
      );
      return event;
    } catch (error) {
      console.error('[Stripe] Webhook signature verification failed:', error);
      return null;
    }
  }
}
