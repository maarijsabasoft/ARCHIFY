"""
Authentication module for Archify
Handles user registration, login, Google OAuth, email verification, and password reset
"""

from flask import Blueprint, request, jsonify, session, redirect, url_for, flash, current_app
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime, timedelta
import jwt
import os
import requests
import secrets
import string
import json
import logging
from authlib.integrations.flask_client import OAuth

# Initialize extensions
db = SQLAlchemy()
bcrypt = Bcrypt()

# Secret key for JWT
SECRET_KEY = os.environ.get('SECRET_KEY', 'archify-secret-key-change-in-production')
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')

# Resend API configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', 're_cxVB8LkY_Fo9nWFAEwdxe6LoAp7q7vipt')
RESEND_FROM_EMAIL = os.environ.get('RESEND_FROM_EMAIL', 'send@support.tokenmap.io')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://archify.mirdemy.com')

# Create blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# OAuth will be initialized in main.py and passed here
oauth = None
google = None
logger = logging.getLogger(__name__)

def init_oauth(oauth_instance):
    """Initialize OAuth for this module"""
    global oauth, google
    oauth = oauth_instance

    # Google OAuth setup
    google = oauth.register(
        name='google',
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid email profile'}
    )

# User Model
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)  # Nullable for Google OAuth users
    name = db.Column(db.String(100), nullable=False)
    avatar = db.Column(db.String(500), nullable=True)
    auth_provider = db.Column(db.String(20), default='email')  # 'email' or 'google'
    google_id = db.Column(db.String(100), unique=True, nullable=True)
    email_verified = db.Column(db.Boolean, default=False)
    verification_token = db.Column(db.String(100), nullable=True)
    verification_token_expires = db.Column(db.DateTime, nullable=True)
    reset_token = db.Column(db.String(100), nullable=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'avatar': self.avatar,
            'auth_provider': self.auth_provider,
            'email_verified': self.email_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

def generate_token(user):
    """Generate JWT token for user"""
    payload = {
        'user_id': user.id,
        'email': user.email,
        'name': user.name,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

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
    """Get current user from Authorization header"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    payload = verify_token(token)
    if not payload:
        return None
    
    return User.query.get(payload['user_id'])

def generate_verification_code():
    """Generate a 6-digit verification code"""
    return ''.join(secrets.choice(string.digits) for _ in range(6))

def generate_reset_token():
    """Generate a secure reset token"""
    return secrets.token_urlsafe(32)

def send_email_via_resend(to_email, subject, html_content):
    """Send email using Resend API"""
    try:
        response = requests.post(
            'https://api.resend.com/emails',
            headers={
                'Authorization': f'Bearer {RESEND_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'from': f'Archify <{RESEND_FROM_EMAIL}>',
                'to': [to_email],
                'subject': subject,
                'html': html_content
            }
        )
        
        if response.status_code == 200 or response.status_code == 201:
            return True, response.json()
        else:
            print(f"Resend API error: {response.status_code} - {response.text}")
            return False, response.text
    except Exception as e:
        print(f"Email sending error: {e}")
        return False, str(e)

def send_verification_email(user, code):
    """Send email verification code"""
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }}
            .container {{ max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }}
            .header h1 {{ color: #ffffff; margin: 0; font-size: 28px; }}
            .content {{ padding: 40px 30px; text-align: center; }}
            .code {{ font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; background: #f8f9fa; padding: 20px 30px; border-radius: 8px; display: inline-block; margin: 20px 0; }}
            .message {{ color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px; }}
            .footer {{ padding: 20px; text-align: center; color: #999; font-size: 12px; background: #f8f9fa; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏠 Archify</h1>
            </div>
            <div class="content">
                <p class="message">Hi {user.name},</p>
                <p class="message">Welcome to Archify! Please verify your email address by entering this code:</p>
                <div class="code">{code}</div>
                <p class="message">This code will expire in 15 minutes.</p>
                <p class="message" style="color: #999; font-size: 14px;">If you didn't create an account with Archify, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>© 2024 Archify. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email_via_resend(user.email, 'Verify your Archify account', html_content)

def send_password_reset_email(user, reset_token):
    """Send password reset email"""
    reset_link = f"{FRONTEND_URL}?reset_token={reset_token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }}
            .container {{ max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; }}
            .header h1 {{ color: #ffffff; margin: 0; font-size: 28px; }}
            .content {{ padding: 40px 30px; text-align: center; }}
            .button {{ display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 30px; font-weight: bold; font-size: 16px; margin: 20px 0; }}
            .message {{ color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px; }}
            .code {{ font-size: 14px; color: #999; word-break: break-all; background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }}
            .footer {{ padding: 20px; text-align: center; color: #999; font-size: 12px; background: #f8f9fa; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏠 Archify</h1>
            </div>
            <div class="content">
                <p class="message">Hi {user.name},</p>
                <p class="message">We received a request to reset your password. Use the code below to reset it:</p>
                <div class="code" style="font-size: 32px; letter-spacing: 6px; font-weight: bold; color: #667eea;">{reset_token[:6].upper()}</div>
                <p class="message">This code will expire in 1 hour.</p>
                <p class="message" style="color: #999; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
                <p>© 2024 Archify. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email_via_resend(user.email, 'Reset your Archify password', html_content)

# Routes
@auth_bp.route('/signup', methods=['POST'])
def signup():
    """Register a new user with email and password"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        
        # Validation
        if not email or not password or not name:
            return jsonify({'success': False, 'error': 'Email, password, and name are required'}), 400
        
        if len(password) < 6:
            return jsonify({'success': False, 'error': 'Password must be at least 6 characters'}), 400
        
        # Check if user exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            if not existing_user.email_verified:
                # Resend verification email
                code = generate_verification_code()
                existing_user.verification_token = code
                existing_user.verification_token_expires = datetime.utcnow() + timedelta(minutes=15)
                existing_user.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
                existing_user.name = name
                db.session.commit()
                
                send_verification_email(existing_user, code)
                
                return jsonify({
                    'success': True,
                    'message': 'Verification code sent to your email',
                    'requires_verification': True,
                    'email': email
                })
            return jsonify({'success': False, 'error': 'Email already registered'}), 400
        
        # Generate verification code
        verification_code = generate_verification_code()
        
        # Create user
        password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
        user = User(
            email=email,
            password_hash=password_hash,
            name=name,
            auth_provider='email',
            email_verified=False,
            verification_token=verification_code,
            verification_token_expires=datetime.utcnow() + timedelta(minutes=15)
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Send verification email
        email_sent, result = send_verification_email(user, verification_code)
        
        if email_sent:
            return jsonify({
                'success': True,
                'message': 'Account created! Please check your email for verification code.',
                'requires_verification': True,
                'email': email
            })
        else:
            # If email fails, still create account but notify user
            return jsonify({
                'success': True,
                'message': 'Account created but email could not be sent. Please try resending verification.',
                'requires_verification': True,
                'email': email,
                'email_error': True
            })
        
    except Exception as e:
        db.session.rollback()
        print(f"Signup error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    """Verify email with code"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        code = data.get('code', '').strip()
        
        if not email or not code:
            return jsonify({'success': False, 'error': 'Email and verification code are required'}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        if user.email_verified:
            return jsonify({'success': False, 'error': 'Email already verified'}), 400
        
        # Check if code matches and not expired
        if user.verification_token != code:
            return jsonify({'success': False, 'error': 'Invalid verification code'}), 400
        
        if user.verification_token_expires and user.verification_token_expires < datetime.utcnow():
            return jsonify({'success': False, 'error': 'Verification code has expired. Please request a new one.'}), 400
        
        # Mark as verified
        user.email_verified = True
        user.verification_token = None
        user.verification_token_expires = None
        db.session.commit()
        
        # Generate token and log user in
        token = generate_token(user)
        
        return jsonify({
            'success': True,
            'message': 'Email verified successfully!',
            'token': token,
            'user': user.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/resend-verification', methods=['POST'])
def resend_verification():
    """Resend verification email"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'success': False, 'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        if user.email_verified:
            return jsonify({'success': False, 'error': 'Email already verified'}), 400
        
        # Generate new code
        code = generate_verification_code()
        user.verification_token = code
        user.verification_token_expires = datetime.utcnow() + timedelta(minutes=15)
        db.session.commit()
        
        # Send email
        email_sent, result = send_verification_email(user, code)
        
        if email_sent:
            return jsonify({
                'success': True,
                'message': 'Verification code sent to your email'
            })
        else:
            return jsonify({'success': False, 'error': 'Failed to send email. Please try again.'}), 500
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Send password reset email"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'success': False, 'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        # Always return success to prevent email enumeration
        if not user:
            return jsonify({
                'success': True,
                'message': 'If an account exists with this email, you will receive a password reset code.'
            })
        
        # Check if user registered with Google only
        if user.auth_provider == 'google' and not user.password_hash:
            return jsonify({
                'success': True,
                'message': 'If an account exists with this email, you will receive a password reset code.'
            })
        
        # Generate reset token (use first 6 chars as the code)
        reset_token = generate_reset_token()
        user.reset_token = reset_token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.session.commit()
        
        # Send email
        email_sent, result = send_password_reset_email(user, reset_token)
        
        return jsonify({
            'success': True,
            'message': 'If an account exists with this email, you will receive a password reset code.'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password with token"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        code = data.get('code', '').strip().upper()
        new_password = data.get('new_password', '')
        
        if not email or not code or not new_password:
            return jsonify({'success': False, 'error': 'Email, code, and new password are required'}), 400
        
        if len(new_password) < 6:
            return jsonify({'success': False, 'error': 'Password must be at least 6 characters'}), 400
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'success': False, 'error': 'Invalid reset code'}), 400
        
        # Check if reset token matches (compare first 6 chars uppercase)
        if not user.reset_token or user.reset_token[:6].upper() != code:
            return jsonify({'success': False, 'error': 'Invalid reset code'}), 400
        
        if user.reset_token_expires and user.reset_token_expires < datetime.utcnow():
            return jsonify({'success': False, 'error': 'Reset code has expired. Please request a new one.'}), 400
        
        # Update password
        user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
        user.reset_token = None
        user.reset_token_expires = None
        db.session.commit()
        
        # Generate token and log user in
        token = generate_token(user)
        
        return jsonify({
            'success': True,
            'message': 'Password reset successfully!',
            'token': token,
            'user': user.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login with email and password"""
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'success': False, 'error': 'Email and password are required'}), 400
        
        # Find user
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'success': False, 'error': 'Invalid email or password'}), 401
        
        # Check if email is verified
        if not user.email_verified and user.auth_provider == 'email':
            # Resend verification code
            code = generate_verification_code()
            user.verification_token = code
            user.verification_token_expires = datetime.utcnow() + timedelta(minutes=15)
            db.session.commit()
            send_verification_email(user, code)
            
            return jsonify({
                'success': False,
                'error': 'Please verify your email first. A new verification code has been sent.',
                'requires_verification': True,
                'email': email
            }), 401
        
        # Check if user registered with Google
        if user.auth_provider == 'google' and not user.password_hash:
            return jsonify({'success': False, 'error': 'This account uses Google Sign-In. Please use Google to login.'}), 401
        
        # Verify password
        if not bcrypt.check_password_hash(user.password_hash, password):
            return jsonify({'success': False, 'error': 'Invalid email or password'}), 401
        
        # Generate token
        token = generate_token(user)
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'token': token,
            'user': user.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/google', methods=['POST'])
def google_auth():
    """Authenticate with Google OAuth"""
    try:
        data = request.json
        credential = data.get('credential')  # Google ID token
        
        if not credential:
            return jsonify({'success': False, 'error': 'Google credential is required'}), 400
        
        # Verify the Google token
        google_user_info = verify_google_token(credential)
        if not google_user_info:
            return jsonify({'success': False, 'error': 'Invalid Google credential'}), 401
        
        email = google_user_info.get('email', '').lower()
        google_id = google_user_info.get('sub')
        name = google_user_info.get('name', email.split('@')[0])
        avatar = google_user_info.get('picture')
        
        # Check if user exists
        user = User.query.filter_by(email=email).first()
        
        if user:
            # Update Google info if needed
            if not user.google_id:
                user.google_id = google_id
                user.avatar = avatar or user.avatar
                user.email_verified = True  # Google emails are verified
                db.session.commit()
        else:
            # Create new user (Google users are auto-verified)
            user = User(
                email=email,
                name=name,
                avatar=avatar,
                auth_provider='google',
                google_id=google_id,
                email_verified=True
            )
            db.session.add(user)
            db.session.commit()
        
        # Generate token
        token = generate_token(user)
        
        return jsonify({
            'success': True,
            'message': 'Google login successful',
            'token': token,
            'user': user.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

def verify_google_token(token):
    """Verify Google ID token and return user info"""
    try:
        # Verify token with Google
        response = requests.get(
            f'https://oauth2.googleapis.com/tokeninfo?id_token={token}'
        )
        
        if response.status_code == 200:
            data = response.json()
            # Verify the token was issued for our client
            if data.get('aud') == GOOGLE_CLIENT_ID:
                return data
            # Also check azp (authorized party) for web clients
            if data.get('azp') == GOOGLE_CLIENT_ID:
                return data
            print(f"Token audience mismatch: {data.get('aud')} vs {GOOGLE_CLIENT_ID}")
            return None
        print(f"Google token verification failed: {response.status_code}")
        return None
    except Exception as e:
        print(f"Google token verification error: {e}")
        return None

@auth_bp.route('/me', methods=['GET'])
def get_me():
    """Get current user info"""
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    return jsonify({
        'success': True,
        'user': user.to_dict()
    })

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout (client-side token removal)"""
    return jsonify({
        'success': True,
        'message': 'Logged out successfully'
    })

@auth_bp.route('/update-profile', methods=['PUT'])
def update_profile():
    """Update user profile"""
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401
    
    try:
        data = request.json
        
        if 'name' in data:
            user.name = data['name'].strip()
        
        if 'avatar' in data:
            user.avatar = data['avatar']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated',
            'user': user.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/change-password', methods=['POST'])
def change_password():
    """Change user password"""
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Not authenticated'}), 401

    if user.auth_provider == 'google' and not user.password_hash:
        return jsonify({'success': False, 'error': 'Google accounts cannot change password'}), 400

    try:
        data = request.json
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')

        if not current_password or not new_password:
            return jsonify({'success': False, 'error': 'Current and new password are required'}), 400

        if len(new_password) < 6:
            return jsonify({'success': False, 'error': 'New password must be at least 6 characters'}), 400

        if not bcrypt.check_password_hash(user.password_hash, current_password):
            return jsonify({'success': False, 'error': 'Current password is incorrect'}), 401

        user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# Google OAuth Routes
@auth_bp.route('/google-login', methods=['GET'])
def google_login():
    """Initiate Google OAuth login"""
    callback_url = url_for('auth.google_auth_callback', _external=True)
    nonce = secrets.token_urlsafe(16)
    session['google_nonce'] = nonce

    logger.debug(f"Initiating Google login with callback: {callback_url}, nonce: {nonce}")

    try:
        return google.authorize_redirect(callback_url, nonce=nonce)
    except Exception as e:
        logger.error(f"Google login initiation failed: {str(e)}")
        return jsonify({'success': False, 'error': f'Google login initiation failed: {str(e)}'}), 500

@auth_bp.route('/google/callback', methods=['GET', 'POST'])
def google_auth_callback():
    """Handle Google OAuth callback"""
    try:
        logger.debug(f"Received Google OAuth callback with request URL: {request.url}")

        token = google.authorize_access_token()
        logger.debug(f"Access token obtained: {json.dumps({k: v for k, v in token.items() if k != 'access_token'}, indent=2)}")

        nonce = session.pop('google_nonce', None)
        user_info = google.parse_id_token(token, nonce=nonce)

        email = user_info.get("email")
        name = user_info.get("name", email.split('@')[0] if email else "User")
        google_id = user_info.get("sub")
        avatar = user_info.get("picture")

        if not email:
            logger.error("No email in user info")
            return jsonify({'success': False, 'error': 'Missing email information from Google'}), 400

        # Check if user exists
        user = User.query.filter_by(email=email).first()

        if user:
            # Update Google info if needed
            if not user.google_id:
                user.google_id = google_id
                user.avatar = avatar or user.avatar
                user.email_verified = True  # Google emails are verified
                db.session.commit()
        else:
            # Create new user (Google users are auto-verified)
            user = User(
                email=email,
                name=name,
                avatar=avatar,
                auth_provider='google',
                google_id=google_id,
                email_verified=True
            )
            db.session.add(user)
            db.session.commit()

        # Generate token
        auth_token = generate_token(user)

        logger.debug(f"Google login successful for user: {email}")

        # For server-side OAuth, we need to redirect with the token
        # In a production app, you'd typically store this in a session or secure cookie
        # For now, we'll redirect to a success page
        success_url = f"{FRONTEND_URL}/auth/success?token={auth_token}&user_id={user.id}"
        return redirect(success_url)

    except Exception as e:
        logger.error(f"Google login failed: {str(e)}")
        db.session.rollback()
        return jsonify({'success': False, 'error': f'Google login failed: {str(e)}'}), 500
