"""
Stripe Integration for Archify
Handles subscriptions, payments, and webhooks
"""

from flask import Blueprint, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import stripe
import os
import jwt

# Initialize Stripe
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://archify.mirdemy.com')
SECRET_KEY = os.environ.get('SECRET_KEY', 'archify-secret-key-change-in-production')

# Import db from auth module
from auth import db, User

# Create blueprint
stripe_bp = Blueprint('stripe', __name__, url_prefix='/api/stripe')

# Subscription Model
class Subscription(db.Model):
    __tablename__ = 'subscriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    stripe_customer_id = db.Column(db.String(100), nullable=True)
    stripe_subscription_id = db.Column(db.String(100), nullable=True)
    plan = db.Column(db.String(50), default='free')  # 'free', 'pro', 'enterprise'
    status = db.Column(db.String(50), default='active')  # 'active', 'canceled', 'past_due', 'trialing'
    current_period_start = db.Column(db.DateTime, nullable=True)
    current_period_end = db.Column(db.DateTime, nullable=True)
    cancel_at_period_end = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('subscription', uselist=False))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'plan': self.plan,
            'status': self.status,
            'current_period_start': self.current_period_start.isoformat() if self.current_period_start else None,
            'current_period_end': self.current_period_end.isoformat() if self.current_period_end else None,
            'cancel_at_period_end': self.cancel_at_period_end,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# AI Usage Model
class AIUsage(db.Model):
    __tablename__ = 'ai_usage'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    usage_count = db.Column(db.Integer, default=0)
    last_reset = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('ai_usage', uselist=False))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'usage_count': self.usage_count,
            'last_reset': self.last_reset.isoformat() if self.last_reset else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# Payment History Model
class PaymentHistory(db.Model):
    __tablename__ = 'payment_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    stripe_payment_intent_id = db.Column(db.String(100), nullable=True)
    stripe_invoice_id = db.Column(db.String(100), nullable=True)
    amount = db.Column(db.Integer, nullable=False)  # Amount in cents
    currency = db.Column(db.String(10), default='usd')
    status = db.Column(db.String(50), nullable=False)  # 'succeeded', 'failed', 'pending'
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('payments', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'amount': self.amount / 100,  # Convert to dollars
            'currency': self.currency,
            'status': self.status,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# Price IDs for different plans - will be created dynamically if not set
PRICE_IDS = {
    'pro_monthly': os.environ.get('STRIPE_PRO_MONTHLY_PRICE_ID', ''),
    'pro_yearly': os.environ.get('STRIPE_PRO_YEARLY_PRICE_ID', ''),
    'enterprise_monthly': os.environ.get('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID', ''),
    'enterprise_yearly': os.environ.get('STRIPE_ENTERPRISE_YEARLY_PRICE_ID', ''),
}

# Price amounts in cents
PRICE_AMOUNTS = {
    'pro_monthly': 2900,  # $29/month
    'pro_yearly': 29000,  # $290/year (2 months free)
    'enterprise_monthly': 9900,  # $99/month
    'enterprise_yearly': 99000,  # $990/year (2 months free)
}

def get_or_create_price(plan_key):
    """Get existing price or create a new one in Stripe"""
    # Check if we have a cached price ID
    if PRICE_IDS.get(plan_key):
        try:
            price = stripe.Price.retrieve(PRICE_IDS[plan_key])
            return price.id
        except stripe.error.InvalidRequestError:
            pass  # Price doesn't exist, create it
    
    # Parse plan details
    parts = plan_key.split('_')
    plan_name = parts[0].capitalize()  # 'pro' or 'enterprise'
    interval = 'month' if parts[1] == 'monthly' else 'year'
    
    # Check if product exists
    products = stripe.Product.list(limit=100)
    product = None
    product_name = f"Archify {plan_name}"
    
    for p in products.data:
        if p.name == product_name:
            product = p
            break
    
    # Create product if it doesn't exist
    if not product:
        product = stripe.Product.create(
            name=product_name,
            description=f"Archify {plan_name} Plan - Full access to {plan_name.lower()} features"
        )
    
    # Create price
    price = stripe.Price.create(
        product=product.id,
        unit_amount=PRICE_AMOUNTS[plan_key],
        currency='usd',
        recurring={'interval': interval},
        metadata={'plan': plan_key}
    )
    
    # Cache the price ID
    PRICE_IDS[plan_key] = price.id
    
    return price.id

def verify_token(token):
    """Verify JWT token and return user data"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def get_current_user():
    """Get current user from JWT token"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    if not payload:
        return None
    
    return User.query.get(payload.get('user_id'))

def get_or_create_stripe_customer(user):
    """Get or create a Stripe customer for the user"""
    subscription = Subscription.query.filter_by(user_id=user.id).first()
    
    if subscription and subscription.stripe_customer_id:
        try:
            customer = stripe.Customer.retrieve(subscription.stripe_customer_id)
            return customer
        except stripe.error.InvalidRequestError:
            pass
    
    # Create new customer
    customer = stripe.Customer.create(
        email=user.email,
        name=user.name,
        metadata={'user_id': str(user.id)}
    )
    
    # Update or create subscription record
    if not subscription:
        subscription = Subscription(user_id=user.id)
        db.session.add(subscription)
    
    subscription.stripe_customer_id = customer.id
    db.session.commit()
    
    return customer

# ============ API Routes ============

@stripe_bp.route('/config', methods=['GET'])
def get_config():
    """Get Stripe publishable key"""
    return jsonify({
        'success': True,
        'publishable_key': STRIPE_PUBLISHABLE_KEY
    })

@stripe_bp.route('/subscription', methods=['GET'])
def get_subscription():
    """Get current user's subscription"""
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    
    subscription = Subscription.query.filter_by(user_id=user.id).first()
    
    if not subscription:
        # Create free subscription for new users
        subscription = Subscription(user_id=user.id, plan='free', status='active')
        db.session.add(subscription)
        db.session.commit()
    
    return jsonify({
        'success': True,
        'subscription': subscription.to_dict()
    })

@stripe_bp.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    """Create a Stripe Checkout session for subscription - supports both logged-in and guest users"""
    user = get_current_user()  # May be None for guest checkout
    
    try:
        data = request.get_json()
        plan = data.get('plan', 'pro')
        billing_period = data.get('billing_period', 'monthly')
        
        # Get or create price ID
        price_key = f"{plan}_{billing_period}"
        
        if price_key not in PRICE_AMOUNTS:
            return jsonify({'success': False, 'error': 'Invalid plan selected'}), 400
        
        price_id = get_or_create_price(price_key)
        
        # Build checkout session parameters
        checkout_params = {
            'payment_method_types': ['card'],
            'line_items': [{
                'price': price_id,
                'quantity': 1,
            }],
            'mode': 'subscription',
            'success_url': f"{FRONTEND_URL}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
            'cancel_url': f"{FRONTEND_URL}/subscription/cancel",
            'metadata': {
                'plan': plan
            },
            'subscription_data': {
                'metadata': {
                    'plan': plan
                }
            }
        }
        
        # If user is logged in, attach to their Stripe customer
        if user:
            customer = get_or_create_stripe_customer(user)
            checkout_params['customer'] = customer.id
            checkout_params['metadata']['user_id'] = str(user.id)
            checkout_params['subscription_data']['metadata']['user_id'] = str(user.id)
        # For guest checkout in subscription mode, Stripe will collect customer email automatically
        
        # Create checkout session
        checkout_session = stripe.checkout.Session.create(**checkout_params)
        
        return jsonify({
            'success': True,
            'checkout_url': checkout_session.url,
            'session_id': checkout_session.id
        })
        
    except stripe.error.StripeError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@stripe_bp.route('/create-portal-session', methods=['POST'])
def create_portal_session():
    """Create a Stripe Customer Portal session for managing subscription"""
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    
    try:
        subscription = Subscription.query.filter_by(user_id=user.id).first()
        
        if not subscription or not subscription.stripe_customer_id:
            return jsonify({'success': False, 'error': 'No subscription found'}), 404
        
        portal_session = stripe.billing_portal.Session.create(
            customer=subscription.stripe_customer_id,
            return_url=f"{FRONTEND_URL}/account"
        )
        
        return jsonify({
            'success': True,
            'portal_url': portal_session.url
        })
        
    except stripe.error.StripeError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@stripe_bp.route('/cancel-subscription', methods=['POST'])
def cancel_subscription():
    """Cancel the current subscription at period end"""
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    
    try:
        subscription = Subscription.query.filter_by(user_id=user.id).first()
        
        if not subscription or not subscription.stripe_subscription_id:
            return jsonify({'success': False, 'error': 'No active subscription found'}), 404
        
        # Cancel at period end (user keeps access until end of billing period)
        stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=True
        )
        
        subscription.cancel_at_period_end = True
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Subscription will be canceled at the end of the billing period',
            'subscription': subscription.to_dict()
        })
        
    except stripe.error.StripeError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@stripe_bp.route('/reactivate-subscription', methods=['POST'])
def reactivate_subscription():
    """Reactivate a subscription that was set to cancel"""
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    
    try:
        subscription = Subscription.query.filter_by(user_id=user.id).first()
        
        if not subscription or not subscription.stripe_subscription_id:
            return jsonify({'success': False, 'error': 'No subscription found'}), 404
        
        # Reactivate subscription
        stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=False
        )
        
        subscription.cancel_at_period_end = False
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Subscription reactivated',
            'subscription': subscription.to_dict()
        })
        
    except stripe.error.StripeError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@stripe_bp.route('/ai-usage', methods=['GET'])
def get_ai_usage():
    """Get user's AI usage information"""
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    usage_info = get_user_ai_usage(user)

    return jsonify({
        'success': True,
        'usage': usage_info
    })

@stripe_bp.route('/payment-history', methods=['GET'])
def get_payment_history():
    """Get user's payment history"""
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    payments = PaymentHistory.query.filter_by(user_id=user.id).order_by(PaymentHistory.created_at.desc()).limit(50).all()

    return jsonify({
        'success': True,
        'payments': [p.to_dict() for p in payments]
    })

@stripe_bp.route('/create-payment-intent', methods=['POST'])
def create_payment_intent():
    """Create a one-time payment intent (for add-ons, credits, etc.)"""
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    
    try:
        data = request.get_json()
        amount = data.get('amount', 0)  # Amount in cents
        description = data.get('description', 'Archify Payment')
        
        if amount < 50:  # Minimum $0.50
            return jsonify({'success': False, 'error': 'Minimum payment amount is $0.50'}), 400
        
        # Get or create Stripe customer
        customer = get_or_create_stripe_customer(user)
        
        # Create payment intent
        payment_intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='usd',
            customer=customer.id,
            description=description,
            metadata={
                'user_id': str(user.id)
            }
        )
        
        return jsonify({
            'success': True,
            'client_secret': payment_intent.client_secret,
            'payment_intent_id': payment_intent.id
        })
        
    except stripe.error.StripeError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@stripe_bp.route('/webhook', methods=['POST'])
def webhook():
    """Handle Stripe webhooks"""
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        return jsonify({'error': 'Invalid signature'}), 400
    
    # Handle the event
    event_type = event['type']
    data = event['data']['object']
    
    try:
        if event_type == 'checkout.session.completed':
            handle_checkout_completed(data)
        
        elif event_type == 'customer.subscription.created':
            handle_subscription_created(data)
        
        elif event_type == 'customer.subscription.updated':
            handle_subscription_updated(data)
        
        elif event_type == 'customer.subscription.deleted':
            handle_subscription_deleted(data)
        
        elif event_type == 'invoice.paid':
            handle_invoice_paid(data)
        
        elif event_type == 'invoice.payment_failed':
            handle_invoice_payment_failed(data)
        
        elif event_type == 'payment_intent.succeeded':
            handle_payment_intent_succeeded(data)
        
        elif event_type == 'payment_intent.payment_failed':
            handle_payment_intent_failed(data)
    
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        # Don't return error to Stripe, just log it
    
    return jsonify({'received': True})

# ============ Webhook Handlers ============

def handle_checkout_completed(session):
    """Handle successful checkout"""
    user_id = session.get('metadata', {}).get('user_id')
    plan = session.get('metadata', {}).get('plan', 'pro')
    
    if not user_id:
        print("No user_id in checkout session metadata")
        return
    
    subscription = Subscription.query.filter_by(user_id=int(user_id)).first()
    if subscription:
        subscription.plan = plan
        subscription.status = 'active'
        db.session.commit()
        print(f"Updated subscription for user {user_id} to plan {plan}")

def handle_subscription_created(stripe_subscription):
    """Handle new subscription"""
    customer_id = stripe_subscription.get('customer')
    subscription_id = stripe_subscription.get('id')
    
    # Find subscription by customer ID
    subscription = Subscription.query.filter_by(stripe_customer_id=customer_id).first()
    
    if subscription:
        subscription.stripe_subscription_id = subscription_id
        subscription.status = stripe_subscription.get('status', 'active')
        subscription.current_period_start = datetime.fromtimestamp(stripe_subscription.get('current_period_start', 0))
        subscription.current_period_end = datetime.fromtimestamp(stripe_subscription.get('current_period_end', 0))
        
        # Get plan from metadata
        plan = stripe_subscription.get('metadata', {}).get('plan', 'pro')
        subscription.plan = plan
        
        db.session.commit()
        print(f"Created subscription {subscription_id} for customer {customer_id}")

def handle_subscription_updated(stripe_subscription):
    """Handle subscription update"""
    subscription_id = stripe_subscription.get('id')
    
    subscription = Subscription.query.filter_by(stripe_subscription_id=subscription_id).first()
    
    if subscription:
        subscription.status = stripe_subscription.get('status', 'active')
        subscription.current_period_start = datetime.fromtimestamp(stripe_subscription.get('current_period_start', 0))
        subscription.current_period_end = datetime.fromtimestamp(stripe_subscription.get('current_period_end', 0))
        subscription.cancel_at_period_end = stripe_subscription.get('cancel_at_period_end', False)
        
        db.session.commit()
        print(f"Updated subscription {subscription_id}")

def handle_subscription_deleted(stripe_subscription):
    """Handle subscription cancellation"""
    subscription_id = stripe_subscription.get('id')
    
    subscription = Subscription.query.filter_by(stripe_subscription_id=subscription_id).first()
    
    if subscription:
        subscription.status = 'canceled'
        subscription.plan = 'free'
        subscription.stripe_subscription_id = None
        db.session.commit()
        print(f"Canceled subscription {subscription_id}")

def handle_invoice_paid(invoice):
    """Handle successful invoice payment"""
    customer_id = invoice.get('customer')
    amount = invoice.get('amount_paid', 0)
    
    subscription = Subscription.query.filter_by(stripe_customer_id=customer_id).first()
    
    if subscription:
        # Record payment
        payment = PaymentHistory(
            user_id=subscription.user_id,
            stripe_invoice_id=invoice.get('id'),
            amount=amount,
            currency=invoice.get('currency', 'usd'),
            status='succeeded',
            description=f"Subscription payment - {subscription.plan.title()} Plan"
        )
        db.session.add(payment)
        db.session.commit()
        print(f"Recorded payment for invoice {invoice.get('id')}")

def handle_invoice_payment_failed(invoice):
    """Handle failed invoice payment"""
    customer_id = invoice.get('customer')
    amount = invoice.get('amount_due', 0)
    
    subscription = Subscription.query.filter_by(stripe_customer_id=customer_id).first()
    
    if subscription:
        subscription.status = 'past_due'
        
        # Record failed payment
        payment = PaymentHistory(
            user_id=subscription.user_id,
            stripe_invoice_id=invoice.get('id'),
            amount=amount,
            currency=invoice.get('currency', 'usd'),
            status='failed',
            description=f"Failed payment - {subscription.plan.title()} Plan"
        )
        db.session.add(payment)
        db.session.commit()
        print(f"Recorded failed payment for invoice {invoice.get('id')}")

def handle_payment_intent_succeeded(payment_intent):
    """Handle successful one-time payment"""
    customer_id = payment_intent.get('customer')
    amount = payment_intent.get('amount', 0)
    
    if customer_id:
        subscription = Subscription.query.filter_by(stripe_customer_id=customer_id).first()
        
        if subscription:
            payment = PaymentHistory(
                user_id=subscription.user_id,
                stripe_payment_intent_id=payment_intent.get('id'),
                amount=amount,
                currency=payment_intent.get('currency', 'usd'),
                status='succeeded',
                description=payment_intent.get('description', 'One-time payment')
            )
            db.session.add(payment)
            db.session.commit()

def handle_payment_intent_failed(payment_intent):
    """Handle failed one-time payment"""
    customer_id = payment_intent.get('customer')
    amount = payment_intent.get('amount', 0)
    
    if customer_id:
        subscription = Subscription.query.filter_by(stripe_customer_id=customer_id).first()
        
        if subscription:
            payment = PaymentHistory(
                user_id=subscription.user_id,
                stripe_payment_intent_id=payment_intent.get('id'),
                amount=amount,
                currency=payment_intent.get('currency', 'usd'),
                status='failed',
                description=payment_intent.get('description', 'Failed payment')
            )
            db.session.add(payment)
            db.session.commit()

# ============ Utility Functions ============

def check_subscription_access(user, required_plan='pro'):
    """Check if user has access to a feature based on their plan"""
    subscription = Subscription.query.filter_by(user_id=user.id).first()
    
    if not subscription:
        return False
    
    plan_hierarchy = {'free': 0, 'pro': 1, 'enterprise': 2}
    user_level = plan_hierarchy.get(subscription.plan, 0)
    required_level = plan_hierarchy.get(required_plan, 1)
    
    return user_level >= required_level and subscription.status in ['active', 'trialing']

def get_plan_limits(plan):
    """Get feature limits for each plan"""
    limits = {
        'free': {
            'designs_per_month': 3,
            'ai_generations': 5,
            'export_formats': ['png'],
            'max_items_per_design': 20,
            'collaboration': False,
            '3d_view': True,
            'priority_support': False
        },
        'pro': {
            'designs_per_month': -1,  # Unlimited
            'ai_generations': 20,
            'export_formats': ['png', 'jpg', 'pdf', 'svg'],
            'max_items_per_design': -1,  # Unlimited
            'collaboration': True,
            '3d_view': True,
            'priority_support': True
        },
        'enterprise': {
            'designs_per_month': -1,
            'ai_generations': -1,  # Unlimited
            'export_formats': ['png', 'jpg', 'pdf', 'svg', 'dwg', 'dxf'],
            'max_items_per_design': -1,
            'collaboration': True,
            '3d_view': True,
            'priority_support': True,
            'api_access': True,
            'custom_branding': True
        }
    }
    return limits.get(plan, limits['free'])

def get_or_create_ai_usage(user):
    """Get or create AI usage record for user"""
    usage = AIUsage.query.filter_by(user_id=user.id).first()

    if not usage:
        usage = AIUsage(user_id=user.id, usage_count=0)
        db.session.add(usage)
        db.session.commit()

    return usage

def check_ai_usage_limit(user):
    """Check if user has reached their AI generation limit"""
    subscription = Subscription.query.filter_by(user_id=user.id).first()
    plan = subscription.plan if subscription else 'free'

    # Get plan limits
    limits = get_plan_limits(plan)
    ai_limit = limits.get('ai_generations', 5)

    # Unlimited for enterprise
    if ai_limit == -1:
        return True, ai_limit, 0

    # Get current usage
    usage = get_or_create_ai_usage(user)

    # Check if within limit
    remaining = ai_limit - usage.usage_count
    has_access = usage.usage_count < ai_limit

    return has_access, ai_limit, remaining

def increment_ai_usage(user):
    """Increment AI usage count for user"""
    usage = get_or_create_ai_usage(user)
    usage.usage_count += 1
    db.session.commit()
    return usage.usage_count

def get_user_ai_usage(user):
    """Get user's AI usage information"""
    subscription = Subscription.query.filter_by(user_id=user.id).first()
    plan = subscription.plan if subscription else 'free'

    limits = get_plan_limits(plan)
    ai_limit = limits.get('ai_generations', 5)

    usage = get_or_create_ai_usage(user)

    if ai_limit == -1:  # Unlimited
        remaining = -1
        used = usage.usage_count
    else:
        remaining = max(0, ai_limit - usage.usage_count)
        used = usage.usage_count

    return {
        'plan': plan,
        'limit': ai_limit,
        'used': used,
        'remaining': remaining,
        'has_access': remaining > 0 or ai_limit == -1
    }

