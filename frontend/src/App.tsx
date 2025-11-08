import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripeCardSetup from './components/StripeCardSetup';
import './App.css';

// Initialize Stripe with the publishable key from environment
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
);

function App() {
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [setupIntentId, setSetupIntentId] = useState<string | null>(null);

  useEffect(() => {
    stripePromise.then((stripe) => {
      if (stripe) {
        setStripeLoaded(true);
        console.log('[Frontend] Stripe loaded successfully');
      } else {
        console.error(
          '[Frontend] Failed to load Stripe. Check VITE_STRIPE_PUBLISHABLE_KEY'
        );
      }
    });
  }, []);

  const handleSuccess = (id: string) => {
    setSetupIntentId(id);
    console.log('[Frontend] Card setup completed with SetupIntent:', id);
  };

  const handleError = (error: string) => {
    console.error('[Frontend] Card setup error:', error);
  };

  if (!stripeLoaded) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading Stripe...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
       

        {/* Main Content */}
        <div className="content">
        

          {/* Card Setup Form */}
          {stripeLoaded && (
            <Elements stripe={stripePromise}>
              <StripeCardSetup
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </Elements>
          )}

          {/* Success State */}
          {setupIntentId && (
            <div className="success-card">
              <h3>✓ Card Successfully Linked</h3>
              <p>
                Your card has been securely saved and is ready for future
                charges.
              </p>
              <div className="setup-intent-id">
                <p className="label">SetupIntent ID:</p>
                <p className="value">{setupIntentId}</p>
              </div>
            </div>
          )}

 
        </div>
      </div>
    </div>
  );
}

export default App;
