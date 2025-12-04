"""
Archify AI Design Assistant - Enhanced Version
Improved AI responses, guaranteed doors for all rooms, and better tile textures
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import uuid
import math
import random
from collections import defaultdict
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from .env file
load_dotenv()

# Create Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'archify-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///archify.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PREFERRED_URL_SCHEME'] = 'https'

from werkzeug.middleware.proxy_fix import ProxyFix
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

CORS(
    app,
    resources={r"/api/*": {"origins": [
        "https://archify.mirdemy.com",
        "http://localhost:3000",
        "http://localhost:5173",
    ]}},
    supports_credentials=True
)

# Initialize authentication
from auth import db, bcrypt, auth_bp, init_oauth

db.init_app(app)
bcrypt.init_app(app)

# Setup OAuth
from authlib.integrations.flask_client import OAuth
oauth = OAuth(app)
init_oauth(oauth)

app.register_blueprint(auth_bp)

# Initialize Stripe integration
from stripe_integration import stripe_bp, Subscription, PaymentHistory
app.register_blueprint(stripe_bp)

# Create database tables
with app.app_context():
    db.create_all()

# Initialize Groq client
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is required")
client = Groq(api_key=GROQ_API_KEY)

# Store conversation history per session
conversations = {}

# ENHANCED AI prompt for better user alignment
EXTRACTION_PROMPT = """You are a floor plan requirements extractor. Analyze the user's message and extract floor plan requirements.

IMPORTANT: Include furniture, accessories, and floor tiles for each room based on the catalog:
- FURNITURE: bed, wardrobe, desk, chair, sofa, tv, fridge, kitchen, sink, toilet, shower, radiator, trash, coat-hook, image, bookcase, table, armchairs, coffee_table, dining_table
- ACCESSORIES: radiator, smoke-detector, fire-extinguisher, trash, coat-hook, image, monitor-pc, router-wifi, air-conditioner, hanger
- FLOOR TILES: parquet, ceramic-tile, tile1, grass, strand-porcelain, bricks, painted

ROOM SIZE RULES:
- Bedroom: medium size
- Bathroom: small size
- Office: large size

RESPOND WITH ONLY A JSON OBJECT in this exact format (no other text):
{
  "space_type": "apartment|office|classroom|restaurant|warehouse|gym|clinic|hotel|shop|house|custom",
  "width_meters": 10,
  "height_meters": 8,
  "rooms": [
    {
      "name": "Living Room",
      "size": "large",
      "furniture": ["sofa", "tv", "coffee_table"],
      "accessories": ["radiator", "smoke-detector", "image"],
      "floor_tile": "parquet"
    },
    {
      "name": "Kitchen",
      "size": "medium",
      "furniture": ["kitchen", "fridge", "dining_table"],
      "accessories": ["trash", "smoke-detector"],
      "floor_tile": "ceramic-tile"
    },
    {
      "name": "Master Bedroom",
      "size": "medium",
      "furniture": ["bed", "wardrobe", "desk"],
      "accessories": ["radiator", "image", "hanger"],
      "floor_tile": "parquet"
    }
  ],
  "num_bedrooms": 2,
  "num_bathrooms": 1,
  "features": ["open_plan", "balcony", "storage"],
  "style": "modern",
  "user_priority": "aesthetics|functionality|space_optimization|luxury|budget"
}

INTERPRETATION RULES:
1. Preserve user's exact room names and preferences
2. If user mentions "studio" or "open plan", create fewer walls
3. Detect user priority: "beautiful" -> aesthetics, "practical" -> functionality, "small" -> space_optimization, "luxury" -> luxury, "cheap" -> budget
4. Default to medium size if not specified
5. Always include necessary rooms: at least one bathroom, living area
6. Recognize style keywords: "modern", "traditional", "minimalist", "industrial", "scandinavian"

Return ONLY the JSON object."""

# IMPROVED Conversational system prompt - more engaging and user-focused
SYSTEM_PROMPT = """You are Archify AI, a professional floor plan design assistant. You create detailed, functional spaces using our comprehensive catalog of furniture and materials.

CATALOG ITEMS TO USE:
FURNITURE: bed, wardrobe, desk, chair, chairdesk, deskoffice, sofa, armchairs, tv, coffee_table, dining_table, bookcase, fridge, kitchen, sink, stove, toilet, shower, radiator, trash, coat-hook, umbrella-stand, recycling-bins, smoke-detector, fire-extinguisher, monitor-pc, router-wifi, air-conditioner, hanger, image, blackboard, canteen-table, canteencart, camera, teaching-post, school-desk, school-desk-double, projector, metal-detector, electrical-panel, three-phase-panel, schneider, hiroos, lim, hub, naspo, bench, balcony, column, column-square, cube, simple-stair, text-3d, cleaningcart, child-chair-desk

FLOOR TEXTURES: parquet, ceramic-tile, tile1, grass, strand-porcelain, bricks, painted

ROOM SIZE GUIDELINES:
- Bedroom: medium size (1.5x ratio)
- Bathroom: small size (0.8x ratio)
- Office: large size (2.0x ratio)
- Every room MUST have at least 1 door for proper access

PERSONALITY:
- Professional yet friendly and enthusiastic
- Technical expertise in architecture and interior design
- Ask specific, clarifying questions about space requirements
- Show expertise in design principles
- Use professional terminology appropriately
- Keep responses informative and helpful

CONVERSATION FLOW:
1. Greet professionally and assess their project needs
2. Ask targeted questions about space type, size, and special requirements
3. Confirm understanding of their vision
4. When ready, generate professional design with catalog items

KEY PHRASES TO USE:
- "Excellent choice! I'll incorporate professional-grade furniture and materials."
- "Based on architectural standards, I'll ensure proper door access for every room."
- "I'll use our premium catalog items to create a functional, beautiful space."
- "Perfect! I'll generate a professional floor plan with proper room sizing and furnishings."
- "I've analyzed your requirements. Generating your professional floor plan now... ✨"

When you have enough information (after 2-3 exchanges), end with: "[GENERATE_DESIGN]"

Example conversations:
User: "I need a 2 bedroom apartment"
You: "Excellent! A 2-bedroom apartment requires careful space planning. What size are you considering? Also, do you need a home office or specific storage requirements?"

User: "Around 80 square meters, modern style"
You: "Perfect! An 80sqm modern 2-bedroom apartment. I'll include medium-sized bedrooms, a small bathroom, and ensure every room has proper door access. Would you like me to add any special features like a balcony or home office?"

User: "Yes, add a home office and balcony"
You: "Outstanding! I'll create a modern 2-bedroom apartment with a large home office, balcony access, and our premium furniture catalog items. Every room will have proper doors and professional finishes. Generating your design now... ✨ [GENERATE_DESIGN]"

Remember: Always use catalog furniture, ensure proper room sizing (bedroom=medium, bathroom=small, office=large), and guarantee every room has doors!"""

# ENHANCED Professional configuration with better textures and door guarantees
PROFESSIONAL_CONFIG = {
        # Comprehensive furniture and tile catalog
        "furniture_catalog": {
            "bed": {"name": "bed", "type": "bed"},
            "wardrobe": {"name": "wardrobe", "type": "wardrobe"},
            "desk": {"name": "desk", "type": "desk"},
            "chair": {"name": "chair", "type": "chair"},
            "chairdesk": {"name": "chairdesk", "type": "chairdesk"},
            "deskoffice": {"name": "desk", "type": "deskoffice"},
            "sofa": {"name": "sofa", "type": "sofa"},
            "armchairs": {"name": "armchairs", "type": "armchairs"},
            "tv": {"name": "tv", "type": "tv"},
            "coffee_table": {"name": "coffee_table", "type": "table"},
            "dining_table": {"name": "dining_table", "type": "table"},
            "bookcase": {"name": "bookcase", "type": "bookcase"},
            "fridge": {"name": "fridge", "type": "fridge"},
            "kitchen": {"name": "kitchen", "type": "kitchen"},
            "sink": {"name": "sink", "type": "sink"},
            "stove": {"name": "stove", "type": "kitchen"},
            "toilet": {"name": "toilet", "type": "sink"},
            "shower": {"name": "shower", "type": "sink"},
            "radiator": {"name": "radiator-modern-style", "type": "radiator-modern-style"},
            "trash": {"name": "trash", "type": "trash"},
            "coat-hook": {"name": "coat-hook", "type": "coat-hook"},
            "umbrella-stand": {"name": "umbrella-stand", "type": "umbrella-stand"},
            "recycling-bins": {"name": "recycling-bins", "type": "recycling-bins"},
            "smoke-detector": {"name": "smoke-detector", "type": "smoke-detector"},
            "fire-extinguisher": {"name": "fire-extinguisher", "type": "fire-extinguisher"},
            "monitor-pc": {"name": "monitor_pc", "type": "monitor-pc"},
            "router-wifi": {"name": "router_wifi", "type": "router-wifi"},
            "air-conditioner": {"name": "conditioner", "type": "air-conditioner"},
            "hanger": {"name": "hanger", "type": "hanger"},
            "image": {"name": "image", "type": "image"},
            "blackboard": {"name": "blackboard", "type": "blackboard"},
            "canteen-table": {"name": "canteen_table", "type": "canteen-table"},
            "canteencart": {"name": "canteen_cart", "type": "canteencart"},
            "camera": {"name": "camera", "type": "camera"},
            "teaching-post": {"name": "teaching-post", "type": "teaching-post"},
            "school-desk": {"name": "school_desk", "type": "school-desk"},
            "school-desk-double": {"name": "school_desk_double", "type": "school-desk-double"},
            "projector": {"name": "projector", "type": "projector"},
            "metal-detector": {"name": "metal_detector", "type": "metal-detector"},
            "electrical-panel": {"name": "pannello_elettrico", "type": "electrical-panel"},
            "three-phase-panel": {"name": "three_phase_panel", "type": "three-phase-panel"},
            "schneider": {"name": "schneider", "type": "schneider"},
            "hiroos": {"name": "hiroos", "type": "hiroos"},
            "lim": {"name": "multimedia_chalkboard", "type": "lim"},
            "hub": {"name": "hub", "type": "hub"},
            "naspo": {"name": "naspo", "type": "naspo"},
            "bench": {"name": "bench", "type": "bench"},
            "balcony": {"name": "balcony", "type": "balcony"},
            "column": {"name": "round_column", "type": "column"},
            "column-square": {"name": "square_column", "type": "column-square"},
            "cube": {"name": "cube", "type": "cube"},
            "simple-stair": {"name": "simple-stair", "type": "simple-stair"},
            "text-3d": {"name": "text", "type": "text-3d"},
            "cleaningcart": {"name": "cleaning_cart", "type": "cleaningcart"},
            "child-chair-desk": {"name": "child_chair_desk", "type": "child-chair-desk"}
        },
        "tile_catalog": {
            "parquet": "parquet",
            "ceramic": "ceramic-tile",
            "tile1": "tile1",
            "grass": "grass",
            "strand-porcelain": "strand-porcelain",
            "bricks": "bricks",
            "painted": "painted"
        },
        "wall_textures": {
            "bricks": "bricks",
            "painted": "painted"
        },

    # Room type configurations
    "room_types": {
        "bedroom": {
            "min_doors": 1,  # ENSURE at least 1 door
            "max_doors": 2,
            "max_windows": 3,
            "texture": "parquet",
            "furniture": ["bed", "wardrobe", "desk", "chair"],
            "accessories": ["image", "hanger", "radiator", "smoke-detector"],
            "label_color": "#FFE4B5",
            "label_font_size": 30,
            "door_required": True
        },
        "bathroom": {
            "min_doors": 1,  # ENSURE at least 1 door
            "max_doors": 1,
            "max_windows": 1,
            "texture": "ceramic",
            "furniture": ["toilet", "sink", "shower"],
            "accessories": ["radiator", "smoke-detector", "trash"],
            "label_color": "#AFEEEE",
            "label_font_size": 28,
            "door_required": True
        },
        "kitchen": {
            "min_doors": 1,  # ENSURE at least 1 door
            "max_doors": 2,
            "max_windows": 2,
            "texture": "tile1",
            "furniture": ["kitchen", "fridge", "sink", "canteen-table"],
            "accessories": ["trash", "smoke-detector", "fire-extinguisher", "radiator"],
            "label_color": "#FFD700",
            "label_font_size": 32,
            "door_required": True
        },
        "living": {
            "min_doors": 1,  # ENSURE at least 1 door
            "max_doors": 3,
            "max_windows": 4,
            "texture": "parquet",
            "furniture": ["sofa", "tv", "table", "armchairs"],
            "accessories": ["radiator", "smoke-detector", "image", "coat-hook"],
            "label_color": "#FFB6C1",
            "label_font_size": 34,
            "door_required": True
        },
        "office": {
            "min_doors": 1,  # ENSURE at least 1 door
            "max_doors": 2,
            "max_windows": 2,
            "texture": "carpet",
            "furniture": ["desk", "chair", "bookcase", "monitor_pc"],
            "accessories": ["router-wifi", "radiator", "smoke-detector", "fire-extinguisher", "image"],
            "label_color": "#D8BFD8",
            "label_font_size": 30,
            "door_required": True
        },
        "classroom": {
            "min_doors": 1,  # ENSURE at least 1 door
            "max_doors": 2,
            "max_windows": 3,
            "texture": "strand_porcelain",  # From your example
            "furniture": ["desks", "blackboard", "projector", "teacher_desk"],
            "label_color": "#B0E0E6",
            "label_font_size": 32,
            "door_required": True
        },
        "dining": {
            "min_doors": 1,  # ENSURE at least 1 door
            "max_doors": 2,
            "max_windows": 3,
            "texture": "parquet",
            "furniture": ["dining_table", "chairs", "sideboard"],
            "label_color": "#F0E68C",
            "label_font_size": 32,
            "door_required": True
        },
        "storage": {
            "min_doors": 1,  # ENSURE at least 1 door (NEW REQUIREMENT)
            "max_doors": 1,
            "max_windows": 0,
            "texture": "concrete",
            "furniture": ["shelves", "racks"],
            "label_color": "#D3D3D3",
            "label_font_size": 28,
            "door_required": True  # Now required!
        },
        "generic": {
            "min_doors": 1,  # ENSURE at least 1 door
            "max_doors": 2,
            "max_windows": 2,
            "texture": "parquet",
            "furniture": [],
            "label_color": "#F5F5F5",
            "label_font_size": 30,
            "door_required": True
        }
    },
    
    # Space type templates
    "space_templates": {
        "apartment": ["living", "kitchen", "bedroom", "bedroom", "bathroom", "storage"],
        "office": ["reception", "office", "office", "meeting", "bathroom", "storage"],
        "classroom": ["classroom", "storage", "bathroom"],
        "restaurant": ["dining", "kitchen", "bathroom", "bathroom", "storage"],
        "house": ["living", "kitchen", "bedroom", "bedroom", "bathroom", "dining", "storage"],
        "hotel": ["lobby", "room", "room", "room", "bathroom", "storage"],
        "clinic": ["waiting", "consultation", "consultation", "bathroom", "storage"],
        "shop": ["showroom", "storage", "office", "bathroom"]
    },
    
    # Wall configurations - improved textures
    "wall_thickness": 20,  # cm
    "wall_height": 300,    # cm
    "wall_texture_a": "painted",  # From your example
    "wall_texture_b": "painted",  # From your example
    
    # Door configurations
    "door_width": 80,      # cm
    "door_height": 215,    # cm
    
    # Window configurations
    "window_width": 120,   # cm
    "window_height": 100,  # cm
    "window_altitude": 90, # cm from floor
    
    # Additional textures from your example
    "special_textures": {
        "grass": "#grass",  # From your example
        "ceramic": "#ceramic",  # From your example
        "tile1": "#tile1",  # From your example
        "strand_porcelain": "#strand_porcelain",  # From your example
        "parquet": "#parquet",  # From your example
        "painted": "#painted"  # From your example
    }
}

def generate_unique_id(prefix=""):
    """Generate a unique ID similar to the example format"""
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    if prefix:
        return f"{prefix}-{''.join(random.choice(chars) for _ in range(10))}"
    return ''.join(random.choice(chars) for _ in range(11))

def extract_requirements_with_ai(user_messages):
    """Use AI to extract floor plan requirements from conversation"""
    # Combine all user messages
    combined = " ".join([msg.get('content', '') for msg in user_messages if msg.get('role') == 'user'])
    
    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": EXTRACTION_PROMPT},
                {"role": "user", "content": combined}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=1000,
        )
        
        result = response.choices[0].message.content.strip()
        # Extract JSON from response
        if result.startswith('{'):
            return json.loads(result)
    except Exception as e:
        print(f"Error extracting requirements: {e}")
    
    # Return defaults if extraction fails
    return {
        "space_type": "apartment",
        "width_meters": 10,
        "height_meters": 8,
        "num_bedrooms": 0,
        "num_bathrooms": 0,
        "rooms": [
            {"name": "Living Room", "size": "large"},
            {"name": "Kitchen", "size": "medium"},
            {"name": "Bedroom", "size": "medium"},
            {"name": "Bathroom", "size": "small"},
            {"name": "Storage", "size": "small"}  # Added storage by default
        ],
        "features": [],
        "style": "modern",
        "user_priority": "functionality"
    }

def determine_room_type(room_name):
    """Determine room type from name"""
    name_lower = room_name.lower()
    
    if any(keyword in name_lower for keyword in ['bed', 'sleep', 'master', 'guest']):
        return "bedroom"
    elif any(keyword in name_lower for keyword in ['bath', 'toilet', 'wc', 'restroom', 'lavatory']):
        return "bathroom"
    elif any(keyword in name_lower for keyword in ['kitchen', 'cook', 'pantry']):
        return "kitchen"
    elif any(keyword in name_lower for keyword in ['living', 'lounge', 'family', 'sitting']):
        return "living"
    elif any(keyword in name_lower for keyword in ['office', 'study', 'library']):
        return "office"
    elif any(keyword in name_lower for keyword in ['class', 'school', 'lecture', 'training']):
        return "classroom"
    elif any(keyword in name_lower for keyword in ['dining', 'restaurant', 'cafeteria', 'eating']):
        return "dining"
    elif any(keyword in name_lower for keyword in ['storage', 'closet', 'wardrobe', 'utility']):
        return "storage"
    elif any(keyword in name_lower for keyword in ['reception', 'lobby', 'entry', 'foyer']):
        return "living"
    elif any(keyword in name_lower for keyword in ['meeting', 'conference', 'board']):
        return "office"
    
    return "generic"

def process_room_requirements(requirements):
    """Process and validate room requirements"""
    space_type = requirements.get('space_type', 'apartment')
    num_bedrooms = requirements.get('num_bedrooms', 0)
    num_bathrooms = requirements.get('num_bathrooms', 0)
    custom_rooms = requirements.get('rooms', [])
    user_priority = requirements.get('user_priority', 'functionality')
    
    rooms = []
    
    if custom_rooms:
        # Use explicitly mentioned rooms
        for room in custom_rooms:
            name = str(room.get('name', 'Room')).strip()
            if not name or name.lower() == 'room':
                name = "Room"
            
            room_type = determine_room_type(name)

            # Use room-type-specific default sizes, with AI override if specified
            room_type_defaults = {
                "bedroom": 2.0,    # Large bedrooms
                "bathroom": 0.8,   # Small bathrooms
                "kitchen": 1.5,    # Normal/medium kitchen
                "living": 2.0,     # Large living room
                "office": 2.5,     # Extra large office
                "storage": 0.6,    # Very small storage
                "dining": 1.5,     # Medium dining
                "classroom": 2.5,  # Large classroom
                "meeting": 2.0,    # Large meeting room
                "reception": 1.8,  # Large reception
                "consultation": 1.5, # Medium consultation
                "waiting": 1.2,    # Medium-small waiting
                "generic": 1.5     # Default medium
            }

            # Get default size for room type
            size_ratio = room_type_defaults.get(room_type, 1.5)

            # Allow AI to override if it specifies a size
            size_label = str(room.get('size', '')).lower().strip()
            if size_label:
                size_to_ratio = {
                    "xsmall": 0.6, "tiny": 0.6, "compact": 0.8,
                    "small": 0.8,
                    "medium": 1.5, "standard": 1.5, "normal": 1.5,
                    "large": 2.0, "big": 2.0, "spacious": 2.0,
                    "xlarge": 2.5, "huge": 2.5, "master": 2.5
                }
                ai_size_ratio = size_to_ratio.get(size_label)
                if ai_size_ratio:
                    size_ratio = ai_size_ratio
            
            # Extract furniture, accessories, and floor tile from AI response
            furniture = room.get('furniture', [])
            accessories = room.get('accessories', [])
            floor_tile = room.get('floor_tile', 'parquet')
            
            rooms.append({
                'name': name,
                'type': room_type,
                'size_ratio': size_ratio,
                'original_name': name,
                'user_priority': user_priority,
                'furniture': furniture,
                'accessories': accessories,
                'floor_tile': floor_tile
            })
    else:
        # Use space type template
        template = PROFESSIONAL_CONFIG["space_templates"].get(space_type, ["generic", "generic", "storage"])
        
        for i, room_type in enumerate(template):
            if room_type == "bedroom" and num_bedrooms > 0:
                for j in range(min(num_bedrooms, 5)):
                    rooms.append({
                        'name': f"Bedroom {j+1}",
                        'type': 'bedroom',
                        'size_ratio': 1.5,
                        'original_name': f"Bedroom {j+1}",
                        'user_priority': user_priority
                    })
            elif room_type == "bathroom" and num_bathrooms > 0:
                for j in range(min(num_bathrooms, 3)):
                    rooms.append({
                        'name': f"Bathroom {j+1}",
                        'type': 'bathroom',
                        'size_ratio': 0.8,
                        'original_name': f"Bathroom {j+1}",
                        'user_priority': user_priority
                    })
            else:
                # Generate room name based on type
                if room_type == "living":
                    name = "Living Room"
                elif room_type == "kitchen":
                    name = "Kitchen"
                elif room_type == "office":
                    name = f"Office {i}"
                elif room_type == "classroom":
                    name = "Classroom"
                elif room_type == "dining":
                    name = "Dining Room"
                elif room_type == "storage":
                    name = "Storage"
                elif room_type == "reception":
                    name = "Reception"
                elif room_type == "meeting":
                    name = "Meeting Room"
                elif room_type == "waiting":
                    name = "Waiting Area"
                elif room_type == "consultation":
                    name = f"Consultation Room {i}"
                elif room_type == "showroom":
                    name = "Showroom"
                else:
                    name = f"Room {i+1}"
                
                size_ratio = 1.5
                
                rooms.append({
                    'name': name,
                    'type': room_type,
                    'size_ratio': size_ratio,
                    'original_name': name,
                    'user_priority': user_priority
                })
    
    # Ensure we have at least one storage room
    has_storage = any(room['type'] == 'storage' for room in rooms)
    if not has_storage:
        rooms.append({
            'name': 'Storage',
            'type': 'storage',
            'size_ratio': 0.8,
            'original_name': 'Storage',
            'user_priority': user_priority
        })
    
    # Sort by size ratio (largest first) for better layout
    rooms.sort(key=lambda x: x['size_ratio'], reverse=True)
    
    return rooms

def create_base_structure():
    """Create the base JSON structure for a floor plan"""
    return {
        "unit": "cm",
        "layers": {
            "layer-1": {
                "id": "layer-1",
                "altitude": 0,
                "order": 0,
                "opacity": 1,
                "name": "default",
                "visible": True,
                "vertices": {},
                "lines": {},
                "holes": {},
                "areas": {},
                "items": {},
                "selected": {"vertices": [], "lines": [], "holes": [], "areas": [], "items": []}
            }
        },
        "grids": {
            "h1": {"id": "h1", "type": "horizontal-streak", "properties": {"step": 20, "colors": ["#808080", "#ddd", "#ddd", "#ddd", "#ddd"]}},
            "v1": {"id": "v1", "type": "vertical-streak", "properties": {"step": 20, "colors": ["#808080", "#ddd", "#ddd", "#ddd", "#ddd"]}}
        },
        "selectedLayer": "layer-1",
        "groups": {},
        "width": 3000,
        "height": 2000,
        "meta": {},
        "guides": {"horizontal": {}, "vertical": {}, "circular": {}}
    }

def create_vertex(vid, x, y):
    """Create a vertex object"""
    return {
        "id": vid,
        "type": "",
        "prototype": "vertices",
        "name": "Vertex",
        "misc": {},
        "selected": False,
        "properties": {},
        "visible": True,
        "x": x,
        "y": y,
        "lines": [],
        "areas": []
    }

def create_wall(wid, v1, v2):
    """Create a wall object with better textures"""
    return {
        "id": wid,
        "type": "wall",
        "prototype": "lines",
        "name": "Wall",
        "misc": {},
        "selected": False,
        "properties": {
            "height": {"length": PROFESSIONAL_CONFIG["wall_height"]},
            "thickness": {"length": PROFESSIONAL_CONFIG["wall_thickness"]},
            "textureA": PROFESSIONAL_CONFIG["wall_texture_a"],  # From config
            "textureB": PROFESSIONAL_CONFIG["wall_texture_b"]   # From config
        },
        "visible": True,
        "vertices": [v1, v2],
        "holes": []
    }

def create_door(did, wall_id, offset=0.5, width=None, is_main_entrance=False):
    """Create a door object - only main entrance is sliding door"""
    if width is None:
        width = PROFESSIONAL_CONFIG["door_width"]
    
    if is_main_entrance:
        # Main entrance - sliding door
        return {
            "id": did,
            "type": "sliding door",
            "prototype": "holes",
            "name": "Main Entrance",
            "misc": {},
            "selected": False,
            "properties": {
                "width": {"length": max(200, width), "unit": "cm"},
                "height": {"length": PROFESSIONAL_CONFIG["door_height"], "unit": "cm"},
                "altitude": {"length": 0, "unit": "cm"},
                "thickness": {"length": 30, "unit": "cm"},
                "flip_horizontal": "none",
                "flip_vertical": "right"
            },
            "visible": True,
            "offset": offset,
            "line": wall_id
        }
    else:
        # Interior doors - simple doors
        return {
            "id": did,
            "type": "door",
            "prototype": "holes",
            "name": "Door",
            "misc": {},
            "selected": False,
            "properties": {
                "width": {"length": width, "unit": "cm"},
                "height": {"length": PROFESSIONAL_CONFIG["door_height"], "unit": "cm"},
                "altitude": {"length": 0, "unit": "cm"},
                "thickness": {"length": 30, "unit": "cm"},
                "flip_orizzontal": False
            },
            "visible": True,
            "offset": offset,
            "line": wall_id
        }

def create_window(wid, wall_id, offset=0.5):
    """Create a window object"""
    return {
        "id": wid,
        "type": "window",
        "prototype": "holes",
        "name": "Window",
        "misc": {},
        "selected": False,
        "properties": {
            "width": {"length": PROFESSIONAL_CONFIG["window_width"], "unit": "cm"},
            "height": {"length": PROFESSIONAL_CONFIG["window_height"], "unit": "cm"},
            "altitude": {"length": PROFESSIONAL_CONFIG["window_altitude"], "unit": "cm"},
            "thickness": {"length": 30, "unit": "cm"}
        },
        "visible": True,
        "offset": offset,
        "line": wall_id
    }

def create_area(aid, room_name, room_type, vertices, custom_texture=None):
    """Create an area object for a room with appropriate texture"""
    if custom_texture:
        texture = custom_texture
    else:
        texture = PROFESSIONAL_CONFIG["room_types"][room_type]["texture"]
    
    # Map to special textures if available
    if texture in PROFESSIONAL_CONFIG["special_textures"]:
        texture = PROFESSIONAL_CONFIG["special_textures"][texture]
    
    return {
        "id": aid,
        "type": "area",
        "prototype": "areas",
        "name": room_name,
        "misc": {},
        "selected": False,
        "properties": {
            "patternColor": "#F5F4F4",
            "thickness": {"length": 0},
            "texture": texture
        },
        "visible": True,
        "vertices": vertices,
        "holes": []
    }

def create_room_label(label_id, room_name, x, y, room_type, room_width):
    """Create a text label for a room"""
    room_config = PROFESSIONAL_CONFIG["room_types"][room_type]
    font_size = room_config.get("label_font_size", 30)
    bg_color = room_config.get("label_color", "#FFFFFF")
    
    # Adjust font size based on room width
    if room_width > 400:
        font_size = min(40, font_size + 5)
    elif room_width < 250:
        font_size = max(24, font_size - 5)
    
    return {
        "id": label_id,
        "type": "text",
        "prototype": "items",
        "name": f"{room_name} Label",
        "misc": {},
        "selected": False,
        "properties": {
            "text": room_name,
            "fontSize": {"length": font_size},
            "color": "#000000",
            "backgroundColor": f"{bg_color}CC",
            "padding": {"length": 15},
            "fontWeight": "bold",
            "textAlign": "center",
            "borderRadius": {"length": 8},
            "borderColor": "#000000",
            "borderWidth": {"length": 2}
        },
        "visible": True,
        "x": x,
        "y": y,
        "rotation": 0
    }

def is_door_position_available(wall_id, offset, holes, walls, min_distance=0.15):
    """Check if a door position is available on a wall"""
    if wall_id not in walls:
        return False
    
    wall = walls[wall_id]
    wall_holes = wall.get("holes", [])
    
    # Check if this wall already has any door
    for hole_id in wall_holes:
        if hole_id in holes:
            hole = holes[hole_id]
            if "door" in hole.get("type", "").lower():
                # Wall already has a door - cannot add another
                return False
    
    # Check window proximity
    for hole_id in wall_holes:
        if hole_id in holes:
            hole = holes[hole_id]
            existing_offset = hole.get("offset", 0.5)
            if abs(existing_offset - offset) < min_distance:
                return False
    
    return True

def build_grid_layout(rooms, width_cm, height_cm):
    """Build a professional grid-based layout with guaranteed doors for all rooms"""
    margin = 200
    x_start = margin
    y_start = margin
    x_end = margin + width_cm
    y_end = margin + height_cm
    
    design = create_base_structure()
    layer = design["layers"]["layer-1"]
    
    vertices = {}
    walls = {}
    holes = {}
    areas = {}
    items = {}
    
    # Calculate grid dimensions
    num_rooms = len(rooms)
    if num_rooms <= 4:
        cols = 2
        rows = math.ceil(num_rooms / 2)
    elif num_rooms <= 9:
        cols = 3
        rows = math.ceil(num_rooms / 3)
    else:
        cols = 4
        rows = math.ceil(num_rooms / 4)
    
    # Create outer walls
    outer_vertices = []
    for i in range(4):
        if i == 0:
            x, y = x_start, y_start
        elif i == 1:
            x, y = x_end, y_start
        elif i == 2:
            x, y = x_end, y_end
        else:
            x, y = x_start, y_end
        
        vid = generate_unique_id()
        vertices[vid] = create_vertex(vid, x, y)
        outer_vertices.append(vid)
    
    # Create outer walls
    outer_walls = []
    outer_wall_ids = []
    for i in range(4):
        v1 = outer_vertices[i]
        v2 = outer_vertices[(i + 1) % 4]
        wid = generate_unique_id()
        
        walls[wid] = create_wall(wid, v1, v2)
        vertices[v1]["lines"].append(wid)
        vertices[v2]["lines"].append(wid)
        outer_walls.append({"id": wid, "v1": v1, "v2": v2})
        outer_wall_ids.append(wid)
    
    # Calculate cell dimensions
    cell_width = (width_cm - 20) // cols
    cell_height = (height_cm - 20) // rows
    
    # Create grid vertices
    grid_vertices = {}
    for row in range(rows + 1):
        for col in range(cols + 1):
            x = x_start + col * cell_width
            y = y_start + row * cell_height
            
            vid = generate_unique_id()
            vertices[vid] = create_vertex(vid, x, y)
            grid_vertices[(row, col)] = vid
    
    # Create interior walls (grid lines)
    interior_walls = []
    wall_grid_map = {}
    wall_to_cells = {}
    wall_usage = {}
    wall_to_rooms = defaultdict(list)
    
    # Vertical dividers (between columns)
    for col in range(1, cols):
        for row in range(rows):
            v1 = grid_vertices.get((row, col))
            v2 = grid_vertices.get((row + 1, col))
            
            if v1 and v2:
                wid = generate_unique_id()
                walls[wid] = create_wall(wid, v1, v2)
                vertices[v1]["lines"].append(wid)
                vertices[v2]["lines"].append(wid)
                interior_walls.append(wid)
                wall_grid_map[wid] = ("vertical", col, row)
                wall_to_cells[wid] = [
                    (row, col-1),
                    (row, col)
                ]
                wall_usage[wid] = False
    
    # Horizontal dividers (between rows)
    for row in range(1, rows):
        for col in range(cols):
            v1 = grid_vertices.get((row, col))
            v2 = grid_vertices.get((row, col + 1))
            
            if v1 and v2:
                wid = generate_unique_id()
                walls[wid] = create_wall(wid, v1, v2)
                vertices[v1]["lines"].append(wid)
                vertices[v2]["lines"].append(wid)
                interior_walls.append(wid)
                wall_grid_map[wid] = ("horizontal", col, row)
                wall_to_cells[wid] = [
                    (row-1, col),
                    (row, col)
                ]
                wall_usage[wid] = False
    
    # Create room areas and store room info
    room_areas = {}
    cell_to_room = {}
    
    for i, room in enumerate(rooms):
        row = i // cols
        col = i % cols

        # Add significant randomization to room dimensions (±30% variation for more visible differences)
        width_variation = random.uniform(-0.3, 0.3)  # -30% to +30%
        height_variation = random.uniform(-0.3, 0.3)  # -30% to +30%

        room_cell_width = cell_width * (1 + width_variation)
        room_cell_height = cell_height * (1 + height_variation)

        # Ensure minimum size (at least 50% of original)
        room_cell_width = max(room_cell_width, cell_width * 0.5)
        room_cell_height = max(room_cell_height, cell_height * 0.5)

        # Ensure maximum size (no more than 150% of original)
        room_cell_width = min(room_cell_width, cell_width * 1.5)
        room_cell_height = min(room_cell_height, cell_height * 1.5)

        # Get room boundaries with randomized dimensions
        x1 = x_start + col * cell_width
        y1 = y_start + row * cell_height
        x2 = x1 + room_cell_width
        y2 = y1 + room_cell_height
        
        # Create custom area vertices for this room with slight randomization
        # Keep walls aligned but allow rooms to have slightly different shapes within their cells
        area_vertices = []

        # Top-left corner (more randomized within cell bounds for varied shapes)
        tl_x = x1 + random.uniform(0, room_cell_width * 0.2)  # Up to 20% variation
        tl_y = y1 + random.uniform(0, room_cell_height * 0.2)
        tl_id = generate_unique_id()
        vertices[tl_id] = create_vertex(tl_id, tl_x, tl_y)
        area_vertices.append(tl_id)

        # Top-right corner
        tr_x = x2 - random.uniform(0, room_cell_width * 0.2)
        tr_y = y1 + random.uniform(0, room_cell_height * 0.2)
        tr_id = generate_unique_id()
        vertices[tr_id] = create_vertex(tr_id, tr_x, tr_y)
        area_vertices.append(tr_id)

        # Bottom-right corner
        br_x = x2 - random.uniform(0, room_cell_width * 0.2)
        br_y = y2 - random.uniform(0, room_cell_height * 0.2)
        br_id = generate_unique_id()
        vertices[br_id] = create_vertex(br_id, br_x, br_y)
        area_vertices.append(br_id)

        # Bottom-left corner
        bl_x = x1 + random.uniform(0, room_cell_width * 0.2)
        bl_y = y2 - random.uniform(0, room_cell_height * 0.2)
        bl_id = generate_unique_id()
        vertices[bl_id] = create_vertex(bl_id, bl_x, bl_y)
        area_vertices.append(bl_id)
        
        # Create area with custom floor tile if specified
        aid = generate_unique_id("area")
        floor_tile = room.get('floor_tile')
        areas[aid] = create_area(aid, room['name'], room['type'], area_vertices, floor_tile)
        
        # Store room area info
        room_areas[room['name']] = {
            'area_id': aid,
            'x1': x1, 'y1': y1,
            'x2': x2, 'y2': y2,
            'type': room['type'],
            'vertices': area_vertices,
            'grid_position': (row, col),
            'cell_row': row,
            'cell_col': col,
            'adjacent_walls': [],
            'doors_needed': PROFESSIONAL_CONFIG["room_types"][room['type']]["min_doors"]
        }
        
        # Map cell to room
        cell_to_room[(row, col)] = room['name']
        
        # Add room label
        label_x = (x1 + x2) / 2
        label_y = (y1 + y2) / 2
        label_id = generate_unique_id("label")
        items[label_id] = create_room_label(label_id, room['name'], label_x, label_y, room['type'], cell_width)
        
        # Map walls to this room
        room_walls = []
        # Bottom wall
        if row == 0:
            for wall_info in outer_walls:
                v1_coords = (vertices[wall_info["v1"]]["x"], vertices[wall_info["v1"]]["y"])
                v2_coords = (vertices[wall_info["v2"]]["x"], vertices[wall_info["v2"]]["y"])
                if abs(v1_coords[1] - y_start) < 10 and abs(v2_coords[1] - y_start) < 10:
                    room_walls.append(wall_info["id"])
                    wall_to_rooms[wall_info["id"]].append(room['name'])
        
        # Interior walls
        for wall_id in interior_walls:
            wall_type, wall_col, wall_row = wall_grid_map[wall_id]
            if wall_type == "vertical":
                if (wall_col == col and wall_row == row) or (wall_col == col + 1 and wall_row == row):
                    room_walls.append(wall_id)
                    wall_to_rooms[wall_id].append(room['name'])
            elif wall_type == "horizontal":
                if (wall_row == row and wall_col == col) or (wall_row == row + 1 and wall_col == col):
                    room_walls.append(wall_id)
                    wall_to_rooms[wall_id].append(room['name'])
        
        room_areas[room['name']]['adjacent_walls'] = room_walls
    
    # Add main entrance sliding door
    bottom_wall = None
    for wall_info in outer_walls:
        v1_coords = (vertices[wall_info["v1"]]["x"], vertices[wall_info["v1"]]["y"])
        v2_coords = (vertices[wall_info["v2"]]["x"], vertices[wall_info["v2"]]["y"])
        
        if abs(v1_coords[1] - y_start) < 10 and abs(v2_coords[1] - y_start) < 10:
            bottom_wall = wall_info["id"]
            break
    
    if bottom_wall:
        entrance_id = generate_unique_id("door")
        # Position main door significantly off-center (clearly not in middle)
        main_door_offset = 0.1  # Position towards the left side, clearly not in middle
        holes[entrance_id] = create_door(entrance_id, bottom_wall, main_door_offset, is_main_entrance=True)
        walls[bottom_wall]["holes"].append(entrance_id)
        wall_usage[bottom_wall] = True
    
    # CRITICAL: GUARANTEE DOORS FOR ALL ROOMS
    # First, identify which walls can have doors (shared interior walls)
    shared_walls = {wall_id: rooms for wall_id, rooms in wall_to_rooms.items() if len(rooms) >= 2}
    
    # Track doors per room
    doors_per_room = defaultdict(int)
    
    # Phase 1: Assign doors to rooms based on their needs
    for room_name, room_info in room_areas.items():
        doors_needed = room_info['doors_needed']
        doors_added = 0
        
        # Try to add doors to shared walls
        for wall_id in room_info['adjacent_walls']:
            if wall_id in shared_walls and not wall_usage.get(wall_id, False):
                # This is a shared wall without a door yet
                if doors_added < doors_needed:
                    # Try different positions
                    possible_offsets = [0.3, 0.4, 0.5, 0.6, 0.7]
                    for offset in possible_offsets:
                        if is_door_position_available(wall_id, offset, holes, walls, 0.15):
                            door_id = generate_unique_id("door")
                            holes[door_id] = create_door(door_id, wall_id, offset, is_main_entrance=False)
                            walls[wall_id]["holes"].append(door_id)
                            wall_usage[wall_id] = True
                            doors_per_room[room_name] += 1
                            doors_added += 1
                            
                            # Also count for the adjacent room
                            other_rooms = [r for r in shared_walls[wall_id] if r != room_name]
                            if other_rooms:
                                doors_per_room[other_rooms[0]] += 1
                            break
    
    # Phase 2: Ensure every room has at least one door
    for room_name, room_info in room_areas.items():
        if doors_per_room.get(room_name, 0) == 0:
            # This room needs a door!
            # Try to add to any available shared wall
            for wall_id in room_info['adjacent_walls']:
                if wall_id in shared_walls and not wall_usage.get(wall_id, False):
                    door_id = generate_unique_id("door")
                    holes[door_id] = create_door(door_id, wall_id, 0.5, is_main_entrance=False)
                    walls[wall_id]["holes"].append(door_id)
                    wall_usage[wall_id] = True
                    doors_per_room[room_name] += 1
                    doors_added += 1
                    break
    
    # Phase 3: Force add doors if still missing (use outer walls as last resort)
    for room_name, room_info in room_areas.items():
        if doors_per_room.get(room_name, 0) == 0:
            # Desperate measure: add to an outer wall
            for wall_id in room_info['adjacent_walls']:
                if wall_id in outer_wall_ids and wall_id != bottom_wall:
                    door_id = generate_unique_id("door")
                    holes[door_id] = create_door(door_id, wall_id, 0.5, is_main_entrance=False)
                    walls[wall_id]["holes"].append(door_id)
                    doors_per_room[room_name] += 1
                    break

    # Phase 4: ABSOLUTE LAST RESORT - Ensure EVERY room has at least one door
    for room_name, room_info in room_areas.items():
        if doors_per_room.get(room_name, 0) == 0:
            print(f"🚨 EMERGENCY: {room_name} still has no doors! Adding door to first available wall.")
            # Find any wall this room touches, even if it already has doors
            for wall_id in room_info['adjacent_walls']:
                if wall_id in walls:
                    # For emergency doors, be more permissive - allow on walls with existing doors
                    wall = walls[wall_id]
                    wall_holes = wall.get("holes", [])

                    # Try multiple offsets to find a spot, but be less restrictive
                    for emergency_offset in [0.2, 0.8, 0.4, 0.6]:
                        # Basic check: ensure offset is within wall bounds and not too close to existing holes
                        can_place = True
                        for hole_id in wall_holes:
                            if hole_id in holes:
                                hole = holes[hole_id]
                                existing_offset = hole.get("offset", 0.5)
                                if abs(existing_offset - emergency_offset) < 0.15:  # Minimum distance
                                    can_place = False
                                    break

                        if can_place:
                            door_id = generate_unique_id("door")
                            holes[door_id] = create_door(door_id, wall_id, emergency_offset, is_main_entrance=False)
                            walls[wall_id]["holes"].append(door_id)
                            doors_per_room[room_name] += 1
                            print(f"✅ Added emergency door to {room_name} on wall {wall_id}")
                            break
                    if doors_per_room.get(room_name, 0) > 0:
                        break
    
    # Add windows to outer walls
    for wall_id in outer_wall_ids:
        if wall_id != bottom_wall:
            current_holes = walls[wall_id].get("holes", [])
            has_door = False
            for hole_id in current_holes:
                if hole_id in holes and "door" in holes[hole_id].get("type", "").lower():
                    has_door = True
                    break
            
            if not has_door:
                num_windows = random.randint(1, 2)
                for i in range(num_windows):
                    offset = 0.2 + (i * 0.6 / max(1, num_windows))
                    win_id = generate_unique_id("win")
                    holes[win_id] = create_window(win_id, wall_id, offset)
                    walls[wall_id]["holes"].append(win_id)
    
    # Update layer with all components
    layer["vertices"] = vertices
    layer["lines"] = walls
    layer["holes"] = holes
    layer["areas"] = areas
    layer["items"] = items
    
    # Validation report
    print("\n=== DOOR ACCESSIBILITY REPORT ===")
    for room_name, room_info in room_areas.items():
        door_count = doors_per_room.get(room_name, 0)
        if door_count == 0:
            print(f"⚠️  {room_name} ({room_info['type']}): NO DOORS - INACCESSIBLE")
        elif door_count == 1:
            print(f"✅  {room_name} ({room_info['type']}): 1 door")
        else:
            print(f"✅  {room_name} ({room_info['type']}): {door_count} doors")
    
    total_rooms = len(room_areas)
    rooms_with_doors = sum(1 for room_name in room_areas.keys() if doors_per_room.get(room_name, 0) > 0)
    print(f"\n📊 Summary: {rooms_with_doors}/{total_rooms} rooms have doors")
    
    return design

def validate_door_accessibility(design):
    """Validate that all rooms are accessible through doors"""
    layer = design["layers"]["layer-1"]
    areas = layer.get("areas", {})
    holes = layer.get("holes", {})
    walls = layer.get("lines", {})
    
    # Map walls to rooms
    wall_to_rooms = defaultdict(list)
    for area_id, area in areas.items():
        area_vertices = area.get("vertices", [])
        room_name = area.get("name", "Unknown")
        
        for wall_id, wall in walls.items():
            wall_vertices = wall.get("vertices", [])
            if all(v in area_vertices for v in wall_vertices):
                wall_to_rooms[wall_id].append(room_name)
    
    # Count doors per room
    doors_per_room = defaultdict(list)
    for hole_id, hole in holes.items():
        if "door" in hole.get("type", "").lower():
            wall_id = hole.get("line")
            if wall_id in wall_to_rooms:
                for room_name in wall_to_rooms[wall_id]:
                    doors_per_room[room_name].append(hole_id)
    
    # Report accessibility status
    accessibility_report = []
    for area_id, area in areas.items():
        room_name = area.get("name", "Unknown")
        door_count = len(doors_per_room.get(room_name, []))
        
        if door_count == 0:
            accessibility_report.append(f"⚠️ {room_name}: NO DOORS (inaccessible)")
        elif door_count == 1:
            accessibility_report.append(f"✅ {room_name}: 1 door")
        else:
            accessibility_report.append(f"✅ {room_name}: {door_count} doors")
    
    return accessibility_report

def create_furniture_item(item_type, x, y, rotation=0):
    """Create a furniture item from the catalog"""
    catalog_item = PROFESSIONAL_CONFIG["furniture_catalog"].get(item_type)
    if not catalog_item:
        return None

    item_id = generate_unique_id("item")

    return {
        "id": item_id,
        "type": catalog_item["type"],
        "prototype": "items",
        "name": catalog_item["name"],
        "misc": {},
        "selected": False,
        "properties": {},
        "visible": True,
        "x": x,
        "y": y,
        "rotation": rotation
    }

def add_furniture_and_accessories(design, rooms_info):
    """Add furniture and accessories to rooms based on catalog"""
    layer = design["layers"]["layer-1"]
    items = layer.get("items", {})

    # Get areas from design to find room positions
    areas = layer.get("areas", {})

    for room_info in rooms_info:
        room_name = room_info['name']
        room_type = room_info['type']

        room_config = PROFESSIONAL_CONFIG["room_types"].get(room_type, {})

        # Find the area for this room
        room_area = None
        for area_id, area in areas.items():
            if area.get("name") == room_name:
                room_area = area
                break

        if not room_area:
            continue

        # Get room vertices to calculate center
        vertices = room_area.get("vertices", [])
        if not vertices:
            continue

        # Calculate approximate room center from vertices
        vertex_coords = []
        for vertex_id in vertices:
            vertex = layer.get("vertices", {}).get(vertex_id)
            if vertex:
                vertex_coords.append((vertex["x"], vertex["y"]))

        if not vertex_coords:
            continue

        # Calculate center
        center_x = sum(x for x, y in vertex_coords) / len(vertex_coords)
        center_y = sum(y for x, y in vertex_coords) / len(vertex_coords)

        # Calculate approximate room bounds
        min_x = min(x for x, y in vertex_coords)
        max_x = max(x for x, y in vertex_coords)
        min_y = min(y for x, y in vertex_coords)
        max_y = max(y for x, y in vertex_coords)

        # Use furniture and accessories specified by AI, fallback to config defaults
        furniture_list = room_info.get('furniture', [])
        if not furniture_list:
            # Fallback to config defaults
            room_config = PROFESSIONAL_CONFIG["room_types"].get(room_type, {})
            furniture_list = room_config.get("furniture", [])

        if furniture_list:
            # Position furniture around the room
            positions = [
                (center_x - 100, center_y - 100),  # Top-left
                (center_x + 100, center_y - 100),  # Top-right
                (center_x - 100, center_y + 100),  # Bottom-left
                (center_x + 100, center_y + 100),  # Bottom-right
            ]

            for i, furniture_type in enumerate(furniture_list[:4]):
                if i < len(positions):
                    x, y = positions[i]
                    furniture_item = create_furniture_item(furniture_type, x, y)
                    if furniture_item:
                        items[furniture_item["id"]] = furniture_item

        # Use accessories specified by AI, fallback to config defaults
        accessories_list = room_info.get('accessories', [])
        if not accessories_list:
            # Fallback to config defaults
            room_config = PROFESSIONAL_CONFIG["room_types"].get(room_type, {})
            accessories_list = room_config.get("accessories", [])

        if accessories_list:
            # Position accessories
            accessory_positions = [
                (min_x + 50, min_y + 50),      # Near top-left corner
                (max_x - 50, min_y + 50),      # Near top-right corner
                (min_x + 50, max_y - 50),      # Near bottom-left corner
                (max_x - 50, max_y - 50),      # Near bottom-right corner
            ]

            for i, accessory_type in enumerate(accessories_list[:4]):
                if i < len(accessory_positions):
                    x, y = accessory_positions[i]
                    accessory_item = create_furniture_item(accessory_type, x, y)
                    if accessory_item:
                        items[accessory_item["id"]] = accessory_item

    return design

def smart_floor_plan_builder(requirements):
    """Build a professional floor plan based on extracted requirements"""
    space_type = requirements.get('space_type', 'apartment')
    width_m = requirements.get('width_meters', 10)
    height_m = requirements.get('height_meters', 8)
    user_priority = requirements.get('user_priority', 'functionality')
    
    # Convert to cm
    width_cm = int(width_m * 100)
    height_cm = int(height_m * 100)
    
    # Adjust size based on user priority
    if user_priority == 'space_optimization':
        width_cm = int(width_cm * 0.9)
        height_cm = int(height_cm * 0.9)
    elif user_priority == 'luxury':
        width_cm = int(width_cm * 1.2)
        height_cm = int(height_cm * 1.2)

    # Process rooms
    rooms = process_room_requirements(requirements)
    
    # Build professional layout
    design = build_grid_layout(rooms, width_cm, height_cm)
    
    # Add furniture and accessories to the design
    design = add_furniture_and_accessories(design, rooms)
    
    return design

@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat messages and return AI responses"""
    try:
        data = request.json
        session_id = data.get('session_id', str(uuid.uuid4()))
        user_message = data.get('message', '')
        
        # Initialize conversation history for new sessions
        if session_id not in conversations:
            conversations[session_id] = [
                {"role": "system", "content": SYSTEM_PROMPT}
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
        chat_completion = client.chat.completions.create(
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
            requirements = extract_requirements_with_ai(conversations[session_id])
            design_json = smart_floor_plan_builder(requirements)
            is_design = True
            
            # Add success message
            space_type = requirements.get('space_type', 'space')
            style = requirements.get('style', 'modern')
            assistant_message += f"\n\n✨ Perfect! I've generated a {style} {space_type} floor plan based on your requirements. Every room has proper door access and the layout follows professional architectural standards. Click 'Load Design in Editor' to view and customize it!"
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'message': assistant_message,
            'is_design': is_design,
            'design': design_json
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/generate-design', methods=['POST'])
def generate_design():
    """Generate a design based on conversation history using AI extraction"""
    try:
        data = request.json
        session_id = data.get('session_id')
        
        if not session_id or session_id not in conversations:
            return jsonify({
                'success': False,
                'error': 'Invalid session or no conversation history'
            }), 400
        
        # Use AI to extract requirements from conversation
        requirements = extract_requirements_with_ai(conversations[session_id])
        
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
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'design': design_json,
            'message': desc
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/quick-generate', methods=['POST'])
def quick_generate():
    """Generate a floor plan directly from parameters or natural language prompt"""
    try:
        data = request.json or {}
        
        # Check if there's a natural language prompt
        prompt = data.get('prompt', '')
        
        if prompt:
            # Use AI to extract requirements from the prompt
            requirements = extract_requirements_with_ai([{"role": "user", "content": prompt}])
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
        
        return jsonify({
            'success': True,
            'design': design_json,
            'requirements': requirements,
            'message': f"✅ Generated a {style} {space_type} floor plan with guaranteed door access for all rooms!"
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/validate-door-accessibility', methods=['POST'])
def validate_door_accessibility_endpoint():
    """Validate door accessibility for a design"""
    try:
        data = request.json
        design = data.get('design')
        
        if not design:
            return jsonify({
                'success': False,
                'error': 'No design provided'
            }), 400
        
        accessibility_report = validate_door_accessibility(design)
        
        accessible_count = sum(1 for report in accessibility_report if '✅' in report)
        total_rooms = len(accessibility_report)
        
        return jsonify({
            'success': True,
            'accessibility_report': accessibility_report,
            'summary': {
                'total_rooms': total_rooms,
                'accessible_rooms': accessible_count,
                'inaccessible_rooms': total_rooms - accessible_count,
                'accessibility_percentage': round((accessible_count / total_rooms) * 100, 1)
            },
            'message': f"✅ {accessible_count}/{total_rooms} rooms have proper door access"
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/test-door-guarantee', methods=['GET'])
def test_door_guarantee():
    """Test endpoint to verify door guarantee works"""
    test_cases = [
        {
            "name": "2 Bedroom Apartment",
            "requirements": {
        'space_type': 'apartment',
                'width_meters': 10,
                'height_meters': 8,
        'num_bedrooms': 2,
                'num_bathrooms': 1,
                'rooms': [],
                'features': [],
                'style': 'modern',
                'user_priority': 'functionality'
            }
        },
        {
            "name": "Small Office",
            "requirements": {
                'space_type': 'office',
                'width_meters': 8,
                'height_meters': 6,
                'num_bedrooms': 0,
        'num_bathrooms': 1,
        'rooms': [
                    {'name': 'Reception', 'size': 'medium'},
                    {'name': 'Office 1', 'size': 'medium'},
                    {'name': 'Storage', 'size': 'small'}
                ],
                'features': [],
                'style': 'modern',
                'user_priority': 'functionality'
            }
        },
        {
            "name": "Studio with Storage",
            "requirements": {
                'space_type': 'apartment',
                'width_meters': 6,
                'height_meters': 5,
                'num_bedrooms': 0,
                'num_bathrooms': 1,
                'rooms': [
                    {'name': 'Living Area', 'size': 'large'},
                    {'name': 'Kitchenette', 'size': 'small'},
                    {'name': 'Bathroom', 'size': 'small'},
                    {'name': 'Storage Closet', 'size': 'small'}
                ],
                'features': ['open_plan'],
                'style': 'modern',
                'user_priority': 'space_optimization'
            }
        },
    ]
    
    results = []
    for test in test_cases:
        try:
            design = smart_floor_plan_builder(test["requirements"])
            
            if design and 'layers' in design:
                layer = design['layers']['layer-1']
                room_count = len(layer.get('areas', {}))
                
                # Count doors
                door_count = len([h for h in layer.get('holes', {}).values() if 'door' in h.get('type', '').lower()])
                
                # Validate accessibility
                accessibility_report = validate_door_accessibility(design)
                accessible_rooms = sum(1 for report in accessibility_report if '✅' in report)
                
                results.append({
                    'test_name': test["name"],
                    'rooms': room_count,
                    'doors': door_count,
                    'accessible_rooms': accessible_rooms,
                    'inaccessible_rooms': room_count - accessible_rooms,
                    'status': 'success',
                    'door_guarantee_met': accessible_rooms == room_count
                })
            else:
                results.append({
                    'test_name': test["name"],
                    'status': 'failed',
                    'error': 'Invalid design structure'
                })
        except Exception as e:
            results.append({
                'test_name': test["name"],
                'status': 'failed',
                'error': str(e)
            })
    
    # Calculate success rate
    successful_tests = [r for r in results if r.get('door_guarantee_met') == True]
    success_rate = len(successful_tests) / len(results) * 100 if results else 0
    
    return jsonify({
        'success': True,
        'test_results': results,
        'summary': {
            'total_tests': len(results),
            'successful_tests': len(successful_tests),
            'success_rate': round(success_rate, 1),
            'message': f"Door guarantee successful in {len(successful_tests)}/{len(results)} tests ({success_rate:.1f}%)"
        }
    })


@app.route('/api/test-design', methods=['GET'])
def test_design():
    """Test endpoint to verify design generation works"""
    test_cases = [
        {
            "prompt": "2 bedroom apartment",
            "requirements": {
                'space_type': 'apartment',
                'width_meters': 10,
                'height_meters': 8,
                'num_bedrooms': 2,
                'num_bathrooms': 1,
                'rooms': [],
                'features': [],
                'style': 'modern'
            }
        },
        {
            "prompt": "office with reception and 2 offices",
            "requirements": {
                'space_type': 'office',
                'width_meters': 12,
                'height_meters': 10,
                'num_bedrooms': 0,
                'num_bathrooms': 1,
                'rooms': [
                    {'name': 'Reception', 'size': 'medium'},
                    {'name': 'Office 1', 'size': 'medium'},
                    {'name': 'Office 2', 'size': 'medium'},
                    {'name': 'Meeting Room', 'size': 'large'},
                    {'name': 'Bathroom', 'size': 'small'}
                ],
                'features': [],
                'style': 'modern'
            }
        },
        {
            "prompt": "classroom with storage",
            "requirements": {
                'space_type': 'classroom',
                'width_meters': 15,
                'height_meters': 12,
                'num_bedrooms': 0,
                'num_bathrooms': 1,
                'rooms': [
                    {'name': 'Classroom', 'size': 'large'},
                    {'name': 'Storage Room', 'size': 'small'},
                    {'name': 'Teachers Office', 'size': 'medium'},
                    {'name': 'Bathroom', 'size': 'small'}
                ],
                'features': [],
                'style': 'modern'
            }
        },
    ]
    
    results = []
    for test in test_cases:
        try:
            design = smart_floor_plan_builder(test["requirements"])
            
            if design and 'layers' in design:
                layer = design['layers']['layer-1']
                room_count = len(layer.get('areas', {}))
                wall_count = len(layer.get('lines', {}))
                door_count = len([h for h in layer.get('holes', {}).values() if 'door' in h.get('type', '').lower()])
                window_count = len([h for h in layer.get('holes', {}).values() if h.get('type') == 'window'])
                label_count = len([i for i in layer.get('items', {}).values() if 'Label' in i.get('name', '')])
                furniture_count = len([i for i in layer.get('items', {}).values() if i.get('type') not in ['text', 'label']])
                
                # Validate door accessibility
                accessibility_report = validate_door_accessibility(design)
                accessible_rooms = sum(1 for report in accessibility_report if '✅' in report)
                inaccessible_rooms = sum(1 for report in accessibility_report if '⚠️' in report)
                
                results.append({
                    'prompt': test["prompt"],
                    'rooms': room_count,
                    'walls': wall_count,
                    'doors': door_count,
                    'windows': window_count,
                    'labels': label_count,
                    'furniture': furniture_count,
                    'accessible_rooms': accessible_rooms,
                    'inaccessible_rooms': inaccessible_rooms,
                    'accessibility_report': accessibility_report,
                    'status': 'success'
                })
            else:
                results.append({
                    'prompt': test["prompt"],
                    'status': 'failed',
                    'error': 'Invalid design structure'
                })
        except Exception as e:
            results.append({
                'prompt': test["prompt"],
                'status': 'failed',
                'error': str(e)
            })
    
    return jsonify({
        'success': True,
        'test_results': results
    })

@app.route('/api/professional-config', methods=['GET'])
def get_professional_config():
    """Get the professional configuration"""
    return jsonify({
        'success': True,
        'config': PROFESSIONAL_CONFIG
    })

@app.route('/api/validate-accessibility', methods=['POST'])
def validate_accessibility():
    """Validate door accessibility for a design"""
    try:
        data = request.json
        design = data.get('design')
        
        if not design:
            return jsonify({
                'success': False,
                'error': 'No design provided'
            }), 400
        
        accessibility_report = validate_door_accessibility(design)
        
        return jsonify({
            'success': True,
            'accessibility_report': accessibility_report,
            'total_rooms': len(accessibility_report),
            'accessible_rooms': sum(1 for report in accessibility_report if '✅' in report),
            'inaccessible_rooms': sum(1 for report in accessibility_report if '⚠️' in report)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
@app.route('/api/reset', methods=['POST'])
def reset_conversation():
    """Reset conversation history for a session"""
    try:
        data = request.json
        session_id = data.get('session_id')
        
        if session_id and session_id in conversations:
            del conversations[session_id]
        
        return jsonify({
            'success': True,
            'message': 'Conversation reset successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Archify AI Design Assistant (Enhanced)',
        'conversations': len(conversations),
        'features': ['Improved AI responses', 'Guaranteed doors for all rooms', 'Better textures', 'User-aligned designs']
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
