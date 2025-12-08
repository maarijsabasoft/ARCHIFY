from groq import Groq

from config import Config
from ..utils.design_utils import conversations, extract_requirements_with_ai
from ..utils.design_generator import smart_floor_plan_builder

class AIService:
    """Service for handling AI-powered design generation"""

    def __init__(self):
        self.client = Groq(api_key=Config.GROQ_API_KEY)

    def chat(self, session_id, user_message):
        """Handle chat messages and return AI responses"""
        # Initialize conversation history for new sessions
        if session_id not in conversations:
            conversations[session_id] = [
                {"role": "system", "content": Config.SYSTEM_PROMPT}
            ]
            # Add initial greeting
            conversations[session_id].append({
                "role": "assistant",
                "content": "Hi there! 👋 I'm Archify AI, your personal floor plan design assistant. I'm excited to help you create your perfect space! Tell me, what kind of space are you looking to design today? (apartment, house, office, studio, etc.) 🏠✨"
            })

        # Add user message to history
        conversations[session_id].append({
            "role": "user",
            "content": user_message
        })

        # Call Groq API
        chat_completion = self.client.chat.completions.create(
            messages=conversations[session_id],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=8000,
        )

        assistant_message = chat_completion.choices[0].message.content

        # Add assistant response to history
        conversations[session_id].append({
            "role": "assistant",
            "content": assistant_message
        })

        # Check if AI signaled to generate design
        is_design = False
        design_json = None

        if '[GENERATE_DESIGN]' in assistant_message:
            assistant_message = assistant_message.replace('[GENERATE_DESIGN]', '').strip()

            # Use AI to extract requirements and build floor plan
            requirements = extract_requirements_with_ai(conversations[session_id], self.client)
            design_json = smart_floor_plan_builder(requirements)
            is_design = True

            # Add success message
            space_type = requirements.get('space_type', 'space')
            style = requirements.get('style', 'modern')
            assistant_message += f"\n\n✨ Perfect! I've generated a {style} {space_type} floor plan based on your requirements. Every room has proper door access and the layout follows professional architectural standards. Click 'Load Design in Editor' to view and customize it!"

        return {
            'success': True,
            'session_id': session_id,
            'message': assistant_message,
            'is_design': is_design,
            'design': design_json
        }

    def generate_design(self, session_id):
        """Generate a design based on conversation history"""
        if not session_id or session_id not in conversations:
            return {
                'success': False,
                'error': 'Invalid session or no conversation history'
            }

        # Use AI to extract requirements from conversation
        requirements = extract_requirements_with_ai(conversations[session_id], self.client)

        # Build floor plan based on extracted requirements
        design_json = smart_floor_plan_builder(requirements)

        # Generate enthusiastic description
        space_type = requirements.get('space_type', 'apartment')
        width = requirements.get('width_meters', 10)
        height = requirements.get('height_meters', 8)
        style = requirements.get('style', 'modern')
        user_priority = requirements.get('user_priority', 'functionality')

        desc = f"🎨 **Design Complete!**\n\n"
        desc += f"I've created a beautiful {style} {space_type} floor plan ({width}m x {height}m) "

        if user_priority == 'aesthetics':
            desc += "with a focus on beautiful aesthetics and visual flow. "
        elif user_priority == 'functionality':
            desc += "designed for maximum functionality and practical use. "
        elif user_priority == 'space_optimization':
            desc += "optimized for space efficiency and smart storage solutions. "
        elif user_priority == 'luxury':
            desc += "with luxurious features and spacious layouts. "

        desc += "Every room has proper door access, and the layout follows professional architectural standards. "
        desc += "The design includes appropriate textures (parquet, ceramic, tile) and furniture placement. "
        desc += "\n\n✅ **Key features:**"
        desc += "\n• Every room has at least one door (including storage rooms)"
        desc += "\n• Professional wall textures (painted surfaces)"
        desc += "\n• Appropriate room labels and furniture"
        desc += "\n• Proper window placement"
        desc += "\n• Grid-based professional layout"

        # Add to conversation history
        conversations[session_id].append({
            "role": "assistant",
            "content": desc
        })

        return {
            'success': True,
            'session_id': session_id,
            'design': design_json,
            'message': desc
        }

    def quick_generate(self, data):
        """Generate a floor plan directly from parameters or natural language prompt"""
        prompt = data.get('prompt', '')

        if prompt:
            # Use AI to extract requirements from the prompt
            requirements = extract_requirements_with_ai([{"role": "user", "content": prompt}], self.client)
        else:
            # Use provided parameters
            requirements = {
                'space_type': data.get('type', 'apartment'),
                'width_meters': data.get('width', 10),
                'height_meters': data.get('height', 8),
                'num_bedrooms': data.get('bedrooms', 0),
                'num_bathrooms': data.get('bathrooms', 0),
                'rooms': data.get('rooms', []),
                'features': data.get('features', []),
                'style': data.get('style', 'modern'),
                'user_priority': data.get('priority', 'functionality')
            }

        # Build the floor plan
        design_json = smart_floor_plan_builder(requirements)

        # Generate description
        space_type = requirements.get('space_type', 'apartment')
        style = requirements.get('style', 'modern')

        return {
            'success': True,
            'design': design_json,
            'requirements': requirements,
            'message': f"✅ Generated a {style} {space_type} floor plan with guaranteed door access for all rooms!"
        }

    def reset_conversation(self, session_id):
        """Reset conversation history for a session"""
        if session_id and session_id in conversations:
            del conversations[session_id]

        return {
            'success': True,
            'message': 'Conversation reset successfully'
        }
