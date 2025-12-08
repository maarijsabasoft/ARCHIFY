import uuid
from flask import Blueprint, request, jsonify, current_app

from ..services.ai_service import AIService

# Import auth functions - using lazy import to avoid circular imports
def get_current_user():
    """Get current user from Authorization header"""
    from auth import get_current_user as _get_current_user
    return _get_current_user()

def check_ai_usage_limit(user):
    """Check if user has reached their AI generation limit"""
    from stripe_integration import check_ai_usage_limit as _check_ai_usage_limit
    return _check_ai_usage_limit(user)

def increment_ai_usage(user):
    """Increment AI usage count for user"""
    from stripe_integration import increment_ai_usage as _increment_ai_usage
    return _increment_ai_usage(user)

def get_user_ai_usage(user):
    """Get user's AI usage information"""
    from stripe_integration import get_user_ai_usage as _get_user_ai_usage
    return _get_user_ai_usage(user)

# Create blueprint
api_bp = Blueprint('api', __name__)

# Initialize AI service
ai_service = AIService()

@api_bp.route('/chat', methods=['POST'])
def chat():
    """Handle chat messages and return AI responses"""
    try:
        # Check authentication
        user = get_current_user()
        if not user:
            return jsonify({
                'success': False,
                'error': 'Authentication required to use AI chatbot'
            }), 401

        data = request.json
        session_id = data.get('session_id', str(uuid.uuid4()))
        user_message = data.get('message', '')

        result = ai_service.chat(session_id, user_message)

        # Check if design was generated and increment usage
        if result.get('success') and result.get('is_design') and result.get('design'):
            # Check AI usage limit before incrementing
            has_access, limit, remaining = check_ai_usage_limit(user)
            if not has_access:
                usage_info = get_user_ai_usage(user)
                return jsonify({
                    'success': False,
                    'error': f'AI generation limit reached. You have used {usage_info["used"]} out of {usage_info["limit"]} generations for your {usage_info["plan"].title()} plan.',
                    'upgrade_required': True,
                    'usage': usage_info
                }), 429

            increment_ai_usage(user)

        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/generate-design', methods=['POST'])
def generate_design():
    """Generate a design based on conversation history"""
    try:
        # Check authentication
        user = get_current_user()
        if not user:
            return jsonify({
                'success': False,
                'error': 'Authentication required to use AI chatbot'
            }), 401

        # Check AI usage limit
        has_access, limit, remaining = check_ai_usage_limit(user)
        if not has_access:
            usage_info = get_user_ai_usage(user)
            return jsonify({
                'success': False,
                'error': f'AI generation limit reached. You have used {usage_info["used"]} out of {usage_info["limit"]} generations for your {usage_info["plan"].title()} plan.',
                'upgrade_required': True,
                'usage': usage_info
            }), 429

        data = request.json
        session_id = data.get('session_id')

        result = ai_service.generate_design(session_id)

        # Increment usage count on successful generation
        if result.get('success') and result.get('design'):
            increment_ai_usage(user)

        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/quick-generate', methods=['POST'])
def quick_generate():
    """Generate a floor plan directly from parameters or natural language prompt"""
    try:
        # Check authentication
        user = get_current_user()
        if not user:
            return jsonify({
                'success': False,
                'error': 'Authentication required to use AI chatbot'
            }), 401

        # Check AI usage limit
        has_access, limit, remaining = check_ai_usage_limit(user)
        if not has_access:
            usage_info = get_user_ai_usage(user)
            return jsonify({
                'success': False,
                'error': f'AI generation limit reached. You have used {usage_info["used"]} out of {usage_info["limit"]} generations for your {usage_info["plan"].title()} plan.',
                'upgrade_required': True,
                'usage': usage_info
            }), 429

        data = request.json or {}

        result = ai_service.quick_generate(data)

        # Increment usage count on successful generation
        if result.get('success') and result.get('design'):
            increment_ai_usage(user)

        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/reset', methods=['POST'])
def reset_conversation():
    """Reset conversation history for a session"""
    try:
        # Check authentication
        user = get_current_user()
        if not user:
            return jsonify({
                'success': False,
                'error': 'Authentication required to use AI chatbot'
            }), 401

        data = request.json
        session_id = data.get('session_id')

        result = ai_service.reset_conversation(session_id)
        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Archify AI Design Assistant (Enhanced)',
        'conversations': len(ai_service.conversations) if hasattr(ai_service, 'conversations') else 0,
        'features': ['Improved AI responses', 'Guaranteed doors for all rooms', 'Better textures', 'User-aligned designs']
    })
