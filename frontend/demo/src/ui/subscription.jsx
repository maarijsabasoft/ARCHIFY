import React from 'react';
import { useAuth } from './auth-modals.jsx';

const API_BASE_URL = 'https://archify.mirdemy.com/api';

// Subscription Context
const SubscriptionContext = React.createContext(null);

export const useSubscription = () => {
  const context = React.useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const auth = useAuth();
  const [subscription, setSubscription] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [stripeKey, setStripeKey] = React.useState(null);

  // Fetch Stripe config
  React.useEffect(function() {
    fetch(API_BASE_URL + '/stripe/config')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          setStripeKey(data.publishable_key);
        }
      })
      .catch(function(err) { console.error('Failed to load Stripe config:', err); });
  }, []);

  // Fetch subscription when user logs in
  React.useEffect(function() {
    if (auth.user && auth.token) {
      fetchSubscription();
    } else {
      setSubscription(null);
    }
  }, [auth.user, auth.token]);

  var fetchSubscription = function() {
    if (!auth.token) return;
    
    setLoading(true);
    fetch(API_BASE_URL + '/stripe/subscription', {
      headers: {
        'Authorization': 'Bearer ' + auth.token
      }
    })
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.success) {
          setSubscription(data.subscription);
        }
        setLoading(false);
      })
      .catch(function(error) {
        console.error('Failed to fetch subscription:', error);
        setLoading(false);
      });
  };

  var createCheckoutSession = function(plan, billingPeriod) {
    billingPeriod = billingPeriod || 'monthly';
    
    var headers = {
      'Content-Type': 'application/json'
    };
    
    // Add auth token if user is logged in (optional for guest checkout)
    if (auth.token) {
      headers['Authorization'] = 'Bearer ' + auth.token;
    }

    return fetch(API_BASE_URL + '/stripe/create-checkout-session', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ plan: plan, billing_period: billingPeriod })
    })
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.success && data.checkout_url) {
          window.location.href = data.checkout_url;
          return data;
        } else {
          throw new Error(data.error || 'Failed to create checkout session');
        }
      })
      .catch(function(error) {
        console.error('Checkout error:', error);
        throw error;
      });
  };

  var openCustomerPortal = function() {
    if (!auth.token) return;

    fetch(API_BASE_URL + '/stripe/create-portal-session', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + auth.token
      }
    })
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.success && data.portal_url) {
          window.location.href = data.portal_url;
        }
      })
      .catch(function(error) {
        console.error('Portal error:', error);
      });
  };

  var cancelSubscription = function() {
    if (!auth.token) return Promise.resolve(false);

    return fetch(API_BASE_URL + '/stripe/cancel-subscription', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + auth.token
      }
    })
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.success) {
          setSubscription(data.subscription);
          return true;
        }
        return false;
      })
      .catch(function(error) {
        console.error('Cancel error:', error);
        return false;
      });
  };

  var reactivateSubscription = function() {
    if (!auth.token) return Promise.resolve(false);

    return fetch(API_BASE_URL + '/stripe/reactivate-subscription', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + auth.token
      }
    })
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.success) {
          setSubscription(data.subscription);
          return true;
        }
        return false;
      })
      .catch(function(error) {
        console.error('Reactivate error:', error);
        return false;
      });
  };

  const isPro = (subscription && subscription.plan === 'pro') || (subscription && subscription.plan === 'enterprise');
  const isEnterprise = subscription && subscription.plan === 'enterprise';

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      loading,
      stripeKey,
      isPro,
      isEnterprise,
      fetchSubscription,
      createCheckoutSession,
      openCustomerPortal,
      cancelSubscription,
      reactivateSubscription
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

// Pricing Section Component
export const PricingSection = ({ onClose }) => {
  const auth = useAuth();
  const { subscription, createCheckoutSession, isPro } = useSubscription();
  const [billingPeriod, setBillingPeriod] = React.useState('monthly');
  const [loading, setLoading] = React.useState(null);

  const plans = [
    {
      name: 'Free',
      id: 'free',
      price: { monthly: 0, yearly: 0 },
      features: [
        '3 designs per month',
        '5 AI generations',
        'Basic 2D & 3D views',
        'PNG export only',
        'Community support'
      ],
      limitations: [
        'Limited to 20 items per design',
        'No collaboration features'
      ],
      cta: 'Current Plan',
      popular: false
    },
    {
      name: 'Pro',
      id: 'pro',
      price: { monthly: 29, yearly: 290 },
      features: [
        'Unlimited designs',
        '100 AI generations/month',
        'Full 2D & 3D views',
        'PNG, JPG, PDF, SVG exports',
        'Priority support',
        'Unlimited items per design',
        'Collaboration features'
      ],
      cta: 'Upgrade to Pro',
      popular: true
    },
    {
      name: 'Enterprise',
      id: 'enterprise',
      price: { monthly: 99, yearly: 990 },
      features: [
        'Everything in Pro',
        'Unlimited AI generations',
        'DWG & DXF exports',
        'API access',
        'Custom branding',
        'Dedicated support',
        'Team management',
        'SSO integration'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ];

  var handleSubscribe = function(planId) {
    if (planId === 'free') return;
    if (planId === 'enterprise') {
      window.location.href = 'mailto:sales@archify.com?subject=Enterprise%20Plan%20Inquiry';
      return;
    }

    if (!auth.user) {
      auth.setShowLoginModal(true);
      return;
    }

    setLoading(planId);
    createCheckoutSession(planId, billingPeriod)
      .then(function() {
        setLoading(null);
      })
      .catch(function(error) {
        auth.showError('Failed to start checkout: ' + error.message);
        setLoading(null);
      });
  };

  const currentPlan = (subscription && subscription.plan) || 'free';

  return (
    <div style={{
      padding: '60px 20px',
      background: '#f8f9fa',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'none',
              border: 'none',
              fontSize: '2rem',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        )}

        <h2 style={{
          textAlign: 'center',
          fontSize: 'clamp(2rem, 4vw, 3rem)',
          marginBottom: '20px',
          color: '#4a5568'
        }}>Choose Your Plan</h2>
        
        <p style={{
          textAlign: 'center',
          fontSize: '1.2rem',
          marginBottom: '40px',
          color: '#666',
          maxWidth: '600px',
          margin: '0 auto 40px'
        }}>
          Unlock the full power of Archify with our premium plans
        </p>

        {/* Billing Toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px',
          marginBottom: '50px'
        }}>
          <span style={{ 
            color: billingPeriod === 'monthly' ? '#4a5568' : '#666',
            fontWeight: billingPeriod === 'monthly' ? 'bold' : 'normal'
          }}>Monthly</span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
            style={{
              width: '60px',
              height: '30px',
              borderRadius: '15px',
              background: billingPeriod === 'yearly' ? 'linear-gradient(135deg, #4a5568 0%, #764ba2 100%)' : '#ddd',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.3s ease'
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: '3px',
              left: billingPeriod === 'yearly' ? '33px' : '3px',
              transition: 'left 0.3s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </button>
          <span style={{ 
            color: billingPeriod === 'yearly' ? '#4a5568' : '#666',
            fontWeight: billingPeriod === 'yearly' ? 'bold' : 'normal'
          }}>
            Yearly <span style={{ color: '#43e97b', fontSize: '0.9rem' }}>(Save 17%)</span>
          </span>
        </div>

        {/* Pricing Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '30px',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            const price = plan.price[billingPeriod];
            
            return (
              <div 
                key={plan.id}
                style={{
                  background: plan.popular ? 'linear-gradient(135deg, #4a5568 0%, #764ba2 100%)' : '#ffffff',
                  color: plan.popular ? '#ffffff' : '#333',
                  padding: '40px 30px',
                  borderRadius: '20px',
                  boxShadow: plan.popular ? '0 20px 60px rgba(102, 126, 234, 0.4)' : '0 10px 30px rgba(0,0,0,0.1)',
                  transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
                  transition: 'transform 0.3s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = plan.popular ? 'scale(1.08)' : 'scale(1.03)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = plan.popular ? 'scale(1.05)' : 'scale(1)'}
              >
                {plan.popular && (
                  <div style={{
                    position: 'absolute',
                    top: '-15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#43e97b',
                    color: '#fff',
                    padding: '5px 20px',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
                  }}>MOST POPULAR</div>
                )}

                <h3 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>{plan.name}</h3>
                
                <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '10px' }}>
                  ${price}
                  {price > 0 && <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>/{billingPeriod === 'yearly' ? 'year' : 'mo'}</span>}
                </div>

                {billingPeriod === 'yearly' && price > 0 && (
                  <p style={{ 
                    fontSize: '0.9rem', 
                    opacity: 0.8, 
                    marginBottom: '20px' 
                  }}>
                    ${Math.round(price / 12)}/month billed annually
                  </p>
                )}

                <ul style={{ 
                  listStyle: 'none', 
                  padding: 0, 
                  marginBottom: '30px',
                  textAlign: 'left'
                }}>
                  {plan.features.map((feature, idx) => (
                    <li key={idx} style={{
                      padding: '10px 0',
                      borderBottom: `1px solid ${plan.popular ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{ color: plan.popular ? '#fff' : '#43e97b' }}>✓</span>
                      {feature}
                    </li>
                  ))}
                  {plan.limitations && plan.limitations.map((limitation, idx) => (
                    <li key={`lim-${idx}`} style={{
                      padding: '10px 0',
                      borderBottom: `1px solid ${plan.popular ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      opacity: 0.7
                    }}>
                      <span style={{ color: '#ff6b6b' }}>✗</span>
                      {limitation}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isCurrentPlan || loading === plan.id}
                  style={{
                    width: '100%',
                    padding: '15px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: isCurrentPlan ? 'default' : 'pointer',
                    background: isCurrentPlan 
                      ? (plan.popular ? 'rgba(255,255,255,0.3)' : '#e9ecef')
                      : (plan.popular ? '#ffffff' : 'linear-gradient(135deg, #4a5568 0%, #764ba2 100%)'),
                    color: isCurrentPlan
                      ? (plan.popular ? '#fff' : '#666')
                      : (plan.popular ? '#4a5568' : '#ffffff'),
                    transition: 'all 0.3s ease',
                    opacity: loading === plan.id ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrentPlan) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {loading === plan.id ? 'Processing...' : (isCurrentPlan ? 'Current Plan' : plan.cta)}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div style={{ marginTop: '80px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '30px', color: '#333' }}>
            Frequently Asked Questions
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
            textAlign: 'left'
          }}>
            {[
              {
                q: 'Can I cancel anytime?',
                a: 'Yes! You can cancel your subscription at any time. You\'ll continue to have access until the end of your billing period.'
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards (Visa, MasterCard, American Express) through our secure Stripe payment system.'
              },
              {
                q: 'Can I upgrade or downgrade my plan?',
                a: 'Absolutely! You can change your plan at any time. Upgrades take effect immediately, and downgrades take effect at the next billing cycle.'
              },
              {
                q: 'Is there a free trial?',
                a: 'Our Free plan lets you try Archify with limited features. Upgrade to Pro to unlock the full experience!'
              }
            ].map((faq, idx) => (
              <div key={idx} style={{
                background: '#fff',
                padding: '25px',
                borderRadius: '15px',
                boxShadow: '0 5px 15px rgba(0,0,0,0.05)'
              }}>
                <h4 style={{ color: '#4a5568', marginBottom: '10px' }}>{faq.q}</h4>
                <p style={{ color: '#666', lineHeight: '1.6', margin: 0 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Subscription Status Badge
export const SubscriptionBadge = ({ style }) => {
  const { subscription, isPro, isEnterprise } = useSubscription();
  
  if (!subscription) return null;

  const plan = subscription.plan || 'free';
  const colors = {
    free: { bg: '#e9ecef', text: '#666' },
    pro: { bg: 'linear-gradient(135deg, #4a5568 0%, #764ba2 100%)', text: '#fff' },
    enterprise: { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', text: '#fff' }
  };

  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      background: (colors[plan] && colors[plan].bg) || colors.free.bg,
      color: (colors[plan] && colors[plan].text) || colors.free.text,
      ...style
    }}>
      {plan}
    </span>
  );
};

// Upgrade Prompt Component
export const UpgradePrompt = ({ feature, onClose }) => {
  const { createCheckoutSession } = useSubscription();
  const [loading, setLoading] = React.useState(false);

  var handleUpgrade = function() {
    setLoading(true);
    createCheckoutSession('pro', 'monthly')
      .then(function() {
        setLoading(false);
      })
      .catch(function(error) {
        auth.showError('Failed to start checkout');
        setLoading(false);
      });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '450px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #4a5568 0%, #764ba2 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '2rem'
        }}>
          ⭐
        </div>
        
        <h3 style={{ fontSize: '1.5rem', marginBottom: '15px', color: '#333' }}>
          Upgrade to Pro
        </h3>
        
        <p style={{ color: '#666', marginBottom: '25px', lineHeight: '1.6' }}>
          {feature ? `"${feature}" is a Pro feature.` : 'Unlock unlimited designs, more AI generations, and premium exports.'} 
          Upgrade now to access all features!
        </p>

        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 25px',
              background: '#e9ecef',
              color: '#666',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Maybe Later
          </button>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            style={{
              padding: '12px 25px',
              background: 'linear-gradient(135deg, #4a5568 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Loading...' : 'Upgrade Now - $29/mo'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Account/Subscription Management Page
export const AccountPage = ({ onBackToHome }) => {
  const auth = useAuth();
  const { 
    subscription, 
    loading, 
    openCustomerPortal, 
    cancelSubscription, 
    reactivateSubscription 
  } = useSubscription();
  const [payments, setPayments] = React.useState([]);
  const [loadingPayments, setLoadingPayments] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);

  React.useEffect(function() {
    if (auth.token) {
      fetchPaymentHistory();
    }
  }, [auth.token]);

  var fetchPaymentHistory = function() {
    setLoadingPayments(true);
    fetch(API_BASE_URL + '/stripe/payment-history', {
      headers: {
        'Authorization': 'Bearer ' + auth.token
      }
    })
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.success) {
          setPayments(data.payments);
        }
        setLoadingPayments(false);
      })
      .catch(function(error) {
        console.error('Failed to fetch payments:', error);
        setLoadingPayments(false);
      });
  };

  var handleCancel = function() {
    if (!confirm('Are you sure you want to cancel your subscription? You\'ll still have access until the end of your billing period.')) {
      return;
    }
    setActionLoading(true);
    cancelSubscription().then(function() {
      setActionLoading(false);
    });
  };

  var handleReactivate = function() {
    setActionLoading(true);
    reactivateSubscription().then(function() {
      setActionLoading(false);
    });
  };

  if (!auth.user) {
    return (
      <div style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2>Please log in to view your account</h2>
        <button 
          onClick={() => auth.setShowLoginModal(true)}
          style={{
            marginTop: '20px',
            padding: '15px 30px',
            background: 'linear-gradient(135deg, #4a5568 0%, #764ba2 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          Log In
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '40px 20px', 
      background: '#f8f9fa', 
      minHeight: '100vh' 
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <button
          onClick={onBackToHome}
          style={{
            background: 'none',
            border: 'none',
            color: '#4a5568',
            fontSize: '1rem',
            cursor: 'pointer',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          ← Back to Home
        </button>

        <h1 style={{ marginBottom: '40px', color: '#333' }}>Account Settings</h1>

        {/* Profile Section */}
        <div style={{
          background: '#fff',
          borderRadius: '15px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#333' }}>Profile</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4a5568 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '2rem',
              fontWeight: 'bold'
            }}>
              {(auth.user.name && auth.user.name.charAt(0) && auth.user.name.charAt(0).toUpperCase()) || 'U'}
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#333' }}>{auth.user.name}</h3>
              <p style={{ margin: '5px 0 0', color: '#666' }}>{auth.user.email}</p>
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <div style={{
          background: '#fff',
          borderRadius: '15px',
          padding: '30px',
          marginBottom: '30px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#333' }}>Subscription</h2>
          
          {loading ? (
            <p>Loading...</p>
          ) : subscription ? (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px',
                background: subscription.plan === 'pro' 
                  ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                  : '#f8f9fa',
                borderRadius: '10px',
                marginBottom: '20px'
              }}>
                <div>
                  <h3 style={{ margin: 0, color: '#333', textTransform: 'capitalize' }}>
                    {subscription.plan} Plan
                  </h3>
                  <p style={{ margin: '5px 0 0', color: '#666' }}>
                    Status: <span style={{ 
                      color: subscription.status === 'active' ? '#43e97b' : '#ff6b6b',
                      fontWeight: 'bold'
                    }}>{subscription.status}</span>
                    {subscription.cancel_at_period_end && (
                      <span style={{ color: '#ff6b6b' }}> (Cancels at period end)</span>
                    )}
                  </p>
                  {subscription.current_period_end && (
                    <p style={{ margin: '5px 0 0', color: '#666', fontSize: '0.9rem' }}>
                      {subscription.cancel_at_period_end ? 'Access until' : 'Renews'}: {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <SubscriptionBadge />
              </div>

              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {subscription.plan !== 'free' && (
                  <React.Fragment>
                    <button
                      onClick={openCustomerPortal}
                      style={{
                        padding: '12px 25px',
                        background: 'linear-gradient(135deg, #4a5568 0%, #764ba2 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      Manage Billing
                    </button>
                    
                    {subscription.cancel_at_period_end ? (
                      <button
                        onClick={handleReactivate}
                        disabled={actionLoading}
                        style={{
                          padding: '12px 25px',
                          background: '#43e97b',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          opacity: actionLoading ? 0.7 : 1
                        }}
                      >
                        {actionLoading ? 'Processing...' : 'Reactivate Subscription'}
                      </button>
                    ) : (
                      <button
                        onClick={handleCancel}
                        disabled={actionLoading}
                        style={{
                          padding: '12px 25px',
                          background: '#fff',
                          color: '#ff6b6b',
                          border: '2px solid #ff6b6b',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          opacity: actionLoading ? 0.7 : 1
                        }}
                      >
                        {actionLoading ? 'Processing...' : 'Cancel Subscription'}
                      </button>
                    )}
                  </React.Fragment>
                )}
                
                {subscription.plan === 'free' && (
                  <button
                    onClick={() => window.location.href = '/#pricing'}
                    style={{
                      padding: '12px 25px',
                      background: 'linear-gradient(135deg, #4a5568 0%, #764ba2 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    Upgrade to Pro
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p>No subscription found</p>
          )}
        </div>

        {/* Payment History Section */}
        <div style={{
          background: '#fff',
          borderRadius: '15px',
          padding: '30px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#333' }}>Payment History</h2>
          
          {loadingPayments ? (
            <p>Loading...</p>
          ) : payments.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                  <th style={{ textAlign: 'left', padding: '10px 0', color: '#666' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '10px 0', color: '#666' }}>Description</th>
                  <th style={{ textAlign: 'right', padding: '10px 0', color: '#666' }}>Amount</th>
                  <th style={{ textAlign: 'right', padding: '10px 0', color: '#666' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                    <td style={{ padding: '15px 0' }}>
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '15px 0' }}>{payment.description}</td>
                    <td style={{ padding: '15px 0', textAlign: 'right' }}>
                      ${payment.amount.toFixed(2)} {payment.currency.toUpperCase()}
                    </td>
                    <td style={{ padding: '15px 0', textAlign: 'right' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        background: payment.status === 'succeeded' ? '#d4edda' : '#f8d7da',
                        color: payment.status === 'succeeded' ? '#155724' : '#721c24'
                      }}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#666' }}>No payment history yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default {
  SubscriptionProvider,
  useSubscription,
  PricingSection,
  SubscriptionBadge,
  UpgradePrompt,
  AccountPage
};

