// =============================================
// Settings Page
// Manage integrations, billing, and preferences
// =============================================

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, ExternalLink, CreditCard } from 'lucide-react';
import { getStripe } from '@/lib/stripe/client';

interface Integration {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  connectedAt?: string;
  accountInfo?: string;
  connectUrl?: string;
}

interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  current: boolean;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionTier | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const success = searchParams.get('success');
  const error = searchParams.get('error');

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      // Fetch integrations status
      const intRes = await fetch('/api/settings/integrations');
      if (intRes.ok) {
        const intData = await intRes.json();
        setIntegrations(intData.integrations);
      }

      // Fetch subscription status
      const subRes = await fetch('/api/settings/subscription');
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData.subscription);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(tierId: string) {
    setCheckoutLoading(tierId);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.sessionId) {
        const stripe = await getStripe();
        await stripe?.redirectToCheckout({ sessionId: data.sessionId });
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  }

  const tiers: SubscriptionTier[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 997,
      description: 'Perfect for single-location clinics getting started with AI marketing',
      features: ['10 ad concepts/month', 'Basic compliance checking', 'Email support', '$5K ad spend limit'],
      current: subscription?.id === 'starter',
    },
    {
      id: 'growth',
      name: 'Growth',
      price: 1497,
      description: 'For growing clinics ready to scale patient acquisition',
      features: ['25 ad concepts/month', 'Advanced compliance + LLM review', 'Priority support', 'Competitor tracking (10)', '$15K ad spend limit'],
      current: subscription?.id === 'growth',
    },
    {
      id: 'full_stack',
      name: 'Full Stack',
      price: 1997,
      description: 'Enterprise-ready with unlimited generation and API access',
      features: ['Unlimited ad concepts', 'White-glove compliance review', 'Dedicated support', 'API access', '$50K ad spend limit'],
      current: subscription?.id === 'full_stack',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* Alerts */}
      {success === 'meta_connected' && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Meta Ads connected successfully! You can now publish ads directly to your ad account.
          </AlertDescription>
        </Alert>
      )}

      {success === 'subscription_active' && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your subscription is now active! You have access to all features in your plan.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error === 'meta_auth_denied' && 'Meta authentication was denied. Please try again.'}
            {error === 'no_ad_accounts' && 'No Meta ad accounts found. Please ensure you have access to a Meta Business account.'}
            {error === 'oauth_failed' && 'Failed to connect to Meta. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect your advertising accounts to enable publishing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{integration.name}</h3>
                  {integration.connected ? (
                    <Badge className="bg-green-100 text-green-800">Connected</Badge>
                  ) : (
                    <Badge variant="secondary">Not Connected</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{integration.description}</p>
                {integration.connected && integration.accountInfo && (
                  <p className="text-sm text-gray-600 mt-1">{integration.accountInfo}</p>
                )}
              </div>
              <Button
                variant={integration.connected ? 'outline' : 'default'}
                onClick={() => {
                  if (integration.connectUrl) {
                    window.location.href = integration.connectUrl;
                  }
                }}
              >
                {integration.connected ? 'Reconnect' : 'Connect'}
                {!integration.connected && <ExternalLink className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          ))}

          {/* Static Meta Integration */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">Meta Ads</h3>
                <Badge variant="secondary">Required for Publishing</Badge>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Connect your Meta Business account to publish ads directly
              </p>
            </div>
            <Button onClick={() => window.location.href = '/api/meta/oauth'}>
              Connect Meta
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Manage your Cortex Ads plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`p-4 border rounded-lg ${
                  tier.current ? 'border-blue-500 bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{tier.name}</h3>
                  {tier.current && <Badge>Current Plan</Badge>}
                </div>
                <p className="text-2xl font-bold mb-2">
                  ${tier.price}
                  <span className="text-sm font-normal text-gray-500">/mo</span>
                </p>
                <p className="text-sm text-gray-600 mb-4">{tier.description}</p>
                <ul className="space-y-2 mb-4">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={tier.current ? 'outline' : 'default'}
                  disabled={tier.current || checkoutLoading === tier.id}
                  onClick={() => handleSubscribe(tier.id)}
                >
                  {checkoutLoading === tier.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : tier.current ? (
                    'Current Plan'
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Subscribe
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
