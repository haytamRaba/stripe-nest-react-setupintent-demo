import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import '../styles/StripeCardSetup.css';

interface StripeCardSetupProps {
  onSuccess?: (setupIntentId: string) => void;
  onError?: (error: string) => void;
}

export default function StripeCardSetup({
  onSuccess,
  onError,
}: StripeCardSetupProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setMessage({
        type: 'error',
        text: 'Stripe has not loaded yet. Please try again.',
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Step 1: Call backend to create SetupIntent
      const setupIntentResponse = await fetch('/api/stripe/setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!setupIntentResponse.ok) {
        throw new Error('Failed to create SetupIntent on backend');
      }

      const { clientSecret, setupIntentId } =
        await setupIntentResponse.json();

      console.log('[Frontend] SetupIntent created:', setupIntentId);

      // Step 2: Confirm the card with Stripe
      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { setupIntent, error } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: 'Test Customer',
            },
          },
        }
      );

      if (error) {
        console.error('[Frontend] Card setup error:', error);
        setMessage({
          type: 'error',
          text: `Card setup failed: ${error.message}`,
        });
        onError?.(error.message || 'Card setup failed');
        return;
      }

      if (setupIntent?.status === 'succeeded') {
        console.log('[Frontend] Card setup succeeded:', setupIntent.id);
        setMessage({
          type: 'success',
          text: `Card successfully linked! SetupIntent ID: ${setupIntent.id}`,
        });
        onSuccess?.(setupIntent.id);

        // Clear the card element
        cardElement.clear();
      } else {
        throw new Error(`Unexpected SetupIntent status: ${setupIntent?.status}`);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('[Frontend] Error:', errorMessage);
      setMessage({
        type: 'error',
        text: errorMessage,
      });
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-setup">
      <div className="card-setup-header">
        <h2>Link Your Card</h2>
        <p>Securely save your card for future payments using Stripe SetupIntent</p>
      </div>

      <form onSubmit={handleSubmit} className="card-setup-form">
        {/* Card Input */}
        <div className="card-element-wrapper">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#fa755a',
                },
              },
            }}
          />
        </div>


        {/* Messages */}
        {message && (
          <div className={`message message-${message.type}`}>
            <p>{message.text}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!stripe || !elements || loading}
          className="submit-button"
        >
          {loading ? 'Processing...' : 'Link Card'}
        </button>

    
      </form>
    </div>
  );
}
