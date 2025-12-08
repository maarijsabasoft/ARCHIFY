import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Application configuration"""

    # Flask configuration
    SECRET_KEY = os.environ.get('SECRET_KEY', 'archify-secret-key-change-in-production')
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///archify.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    PREFERRED_URL_SCHEME = 'https'

    # CORS configuration
    CORS_ORIGINS = [
        "https://archify.mirdemy.com",
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    # AI Configuration
    GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY environment variable is required")

    # AI Prompts and configurations
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

    # Professional design configuration
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
