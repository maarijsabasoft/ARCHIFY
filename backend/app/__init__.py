from flask import Flask
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from authlib.integrations.flask_client import OAuth

from config import Config
from auth import db, bcrypt, auth_bp, init_oauth
from stripe_integration import stripe_bp

def create_app(config_class=Config):
    """Application factory pattern"""

    # Create Flask app
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Apply proxy fix middleware
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

    # Configure CORS
    CORS(
        app,
        resources={r"/api/*": {"origins": config_class.CORS_ORIGINS}},
        supports_credentials=True
    )

    # Initialize database
    db.init_app(app)
    bcrypt.init_app(app)

    # Setup OAuth
    oauth = OAuth(app)
    init_oauth(oauth)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(stripe_bp)

    # Create database tables
    with app.app_context():
        db.create_all()

    # Register routes
    from .routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')

    return app
