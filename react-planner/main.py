"""
Archify AI Design Assistant - Flask Backend with Groq Chatbot
This backend handles conversational AI for generating react-planner JSON structures.
Includes user authentication with SQLite database.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import uuid
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from .env file
load_dotenv()

# Create Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'archify-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///archify.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app, supports_credentials=True)

# Initialize authentication
from auth import db, bcrypt, auth_bp

db.init_app(app)
bcrypt.init_app(app)
app.register_blueprint(auth_bp)

# Initialize Stripe integration
from stripe_integration import stripe_bp, Subscription, PaymentHistory
app.register_blueprint(stripe_bp)

# Create database tables
with app.app_context():
    db.create_all()

# Initialize Groq client
# Set GROQ_API_KEY environment variable before running
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY environment variable is required")
client = Groq(api_key=GROQ_API_KEY)

# Store conversation history per session
conversations = {}

# AI prompt to extract requirements from user input
EXTRACTION_PROMPT = """You are a floor plan requirements extractor. Analyze the user's message and extract floor plan requirements.

RESPOND WITH ONLY A JSON OBJECT in this exact format (no other text):
{
  "space_type": "apartment|office|classroom|restaurant|warehouse|gym|clinic|hotel|shop|custom",
  "width_meters": 10,
  "height_meters": 8,
  "rooms": [
    {"name": "living room", "size": "large"},
    {"name": "kitchen", "size": "medium"},
    {"name": "bedroom", "size": "medium"},
    {"name": "bathroom", "size": "small"}
  ],
  "num_bedrooms": 2,
  "num_bathrooms": 1,
  "features": ["open_plan", "balcony", "storage"],
  "style": "modern"
}

RULES:
1. Default width: 10 meters, height: 8 meters if not specified
2. Extract room count from phrases like "2 bedroom", "3 BR", "two bedrooms"
3. Identify space type from context (apartment, office, school, etc.)
4. Size can be: "small" (2-3m), "medium" (3-4m), "large" (4-6m), "xlarge" (6+m)
5. Always include at least 1 bathroom for residential
6. For offices: include reception, offices, meeting room
7. For restaurants: include dining, kitchen, restrooms
8. For classrooms: include teaching area, storage

EXAMPLES:
- "2 bedroom apartment" -> num_bedrooms: 2, space_type: "apartment"
- "small office with 3 rooms" -> space_type: "office", rooms with 3 offices
- "restaurant 15x12" -> space_type: "restaurant", width: 15, height: 12
- "3 bhk flat 1200 sqft" -> num_bedrooms: 3, calculate dimensions from sqft

Extract from the user message and return ONLY the JSON object."""

# Conversational system prompt
SYSTEM_PROMPT = """You are Archify AI, a friendly floor plan design assistant. Help users create floor plans by understanding their needs.

YOUR ROLE:
1. Greet users and ask what kind of space they want to design
2. Ask clarifying questions about:
   - Type of space (apartment, office, classroom, etc.)
   - Size/dimensions
   - Number of rooms/bedrooms
   - Any special requirements
3. After gathering info (2-3 questions max), tell them you'll generate the design

KEEP RESPONSES SHORT AND FRIENDLY. Don't explain technical details.

Example conversation:
User: "I need a floor plan"
You: "Hi! I'd love to help you design a floor plan. What type of space are you looking for? (apartment, office, classroom, etc.)"

User: "2 bedroom apartment"
You: "Great! A 2-bedroom apartment. What size are you thinking? (e.g., 10m x 8m, or small/medium/large)"

User: "medium size"
You: "Perfect! I'll create a medium-sized 2-bedroom apartment with a living room, kitchen, 2 bedrooms, and bathroom. Generating your design now..."

When the user provides enough information, end your response with: [GENERATE_DESIGN]
This signals the system to create the floor plan.

NEVER output JSON directly. Just have a natural conversation and use [GENERATE_DESIGN] when ready."""

import re
import math

def generate_unique_id(prefix):
    """Generate a unique ID with a prefix"""
    return f"{prefix}-{uuid.uuid4().hex[:8]}"

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
    except:
        pass
    
    # Return defaults if extraction fails
    return {
        "space_type": "apartment",
        "width_meters": 10,
        "height_meters": 8,
        "num_bedrooms": 2,
        "num_bathrooms": 1,
        "rooms": []
    }

def smart_floor_plan_builder(requirements):
    """Build a floor plan based on extracted requirements"""
    
    space_type = requirements.get('space_type', 'apartment')
    width_m = requirements.get('width_meters', 10)
    height_m = requirements.get('height_meters', 8)
    num_bedrooms = requirements.get('num_bedrooms', 2)
    num_bathrooms = requirements.get('num_bathrooms', 1)
    custom_rooms = requirements.get('rooms', [])
    
    # Convert to cm
    width_cm = int(width_m * 100)
    height_cm = int(height_m * 100)
    
    # Determine rooms based on space type
    rooms = []
    
    if space_type in ['apartment', 'flat', 'house', 'home', 'residential']:
        rooms.append({'name': 'living', 'type': 'living', 'size_ratio': 0.25})
        rooms.append({'name': 'kitchen', 'type': 'kitchen', 'size_ratio': 0.12})
        for i in range(num_bedrooms):
            rooms.append({'name': f'bedroom{i+1}', 'type': 'bedroom', 'size_ratio': 0.18})
        for i in range(num_bathrooms):
            rooms.append({'name': f'bathroom{i+1}', 'type': 'bathroom', 'size_ratio': 0.08})
    
    elif space_type == 'studio':
        rooms.append({'name': 'main', 'type': 'living', 'size_ratio': 0.75})
        rooms.append({'name': 'bathroom', 'type': 'bathroom', 'size_ratio': 0.15})
    
    elif space_type == 'office':
        rooms.append({'name': 'reception', 'type': 'reception', 'size_ratio': 0.2})
        rooms.append({'name': 'office1', 'type': 'office', 'size_ratio': 0.2})
        rooms.append({'name': 'office2', 'type': 'office', 'size_ratio': 0.2})
        rooms.append({'name': 'meeting', 'type': 'meeting', 'size_ratio': 0.2})
        rooms.append({'name': 'kitchen', 'type': 'kitchen', 'size_ratio': 0.1})
        rooms.append({'name': 'bathroom', 'type': 'bathroom', 'size_ratio': 0.1})
    
    elif space_type in ['classroom', 'school']:
        rooms.append({'name': 'classroom', 'type': 'classroom', 'size_ratio': 0.7})
        rooms.append({'name': 'storage', 'type': 'storage', 'size_ratio': 0.15})
        rooms.append({'name': 'bathroom', 'type': 'bathroom', 'size_ratio': 0.15})
    
    elif space_type == 'restaurant':
        rooms.append({'name': 'dining', 'type': 'dining', 'size_ratio': 0.5})
        rooms.append({'name': 'kitchen', 'type': 'kitchen', 'size_ratio': 0.25})
        rooms.append({'name': 'restroom1', 'type': 'bathroom', 'size_ratio': 0.08})
        rooms.append({'name': 'restroom2', 'type': 'bathroom', 'size_ratio': 0.08})
        rooms.append({'name': 'storage', 'type': 'storage', 'size_ratio': 0.09})
    
    elif space_type in ['clinic', 'hospital', 'medical']:
        rooms.append({'name': 'waiting', 'type': 'reception', 'size_ratio': 0.2})
        rooms.append({'name': 'exam1', 'type': 'office', 'size_ratio': 0.2})
        rooms.append({'name': 'exam2', 'type': 'office', 'size_ratio': 0.2})
        rooms.append({'name': 'office', 'type': 'office', 'size_ratio': 0.15})
        rooms.append({'name': 'storage', 'type': 'storage', 'size_ratio': 0.1})
        rooms.append({'name': 'bathroom', 'type': 'bathroom', 'size_ratio': 0.15})
    
    elif space_type in ['shop', 'store', 'retail']:
        rooms.append({'name': 'sales', 'type': 'sales', 'size_ratio': 0.6})
        rooms.append({'name': 'storage', 'type': 'storage', 'size_ratio': 0.2})
        rooms.append({'name': 'office', 'type': 'office', 'size_ratio': 0.1})
        rooms.append({'name': 'bathroom', 'type': 'bathroom', 'size_ratio': 0.1})
    
    elif space_type in ['gym', 'fitness']:
        rooms.append({'name': 'workout', 'type': 'gym', 'size_ratio': 0.5})
        rooms.append({'name': 'cardio', 'type': 'gym', 'size_ratio': 0.2})
        rooms.append({'name': 'locker', 'type': 'locker', 'size_ratio': 0.15})
        rooms.append({'name': 'bathroom', 'type': 'bathroom', 'size_ratio': 0.15})
    
    elif space_type in ['hotel', 'motel']:
        rooms.append({'name': 'bedroom', 'type': 'bedroom', 'size_ratio': 0.5})
        rooms.append({'name': 'living', 'type': 'living', 'size_ratio': 0.25})
        rooms.append({'name': 'bathroom', 'type': 'bathroom', 'size_ratio': 0.2})
        rooms.append({'name': 'closet', 'type': 'storage', 'size_ratio': 0.05})
    
    else:
        # Default/custom - create based on custom rooms or default apartment
        if custom_rooms:
            for room in custom_rooms:
                rooms.append({
                    'name': room.get('name', 'room'),
                    'type': room.get('name', 'room'),
                    'size_ratio': 0.2
                })
        else:
            # Default to 2-bedroom apartment
            rooms = [
                {'name': 'living', 'type': 'living', 'size_ratio': 0.25},
                {'name': 'kitchen', 'type': 'kitchen', 'size_ratio': 0.12},
                {'name': 'bedroom1', 'type': 'bedroom', 'size_ratio': 0.2},
                {'name': 'bedroom2', 'type': 'bedroom', 'size_ratio': 0.2},
                {'name': 'bathroom', 'type': 'bathroom', 'size_ratio': 0.1}
            ]
    
    # Build the floor plan
    return build_floor_plan_from_rooms(rooms, width_cm, height_cm)

def build_floor_plan_from_rooms(rooms, width_cm, height_cm):
    """Build a floor plan by laying out rooms in a grid"""
    
    margin = 200
    x1, y1 = margin, margin
    x2, y2 = margin + width_cm, margin + height_cm
    
    design = create_base_structure()
    layer = design["layers"]["layer-1"]
    
    vertices = {}
    walls = {}
    holes = {}
    
    vertex_id = 1
    wall_id = 1
    door_id = 1
    window_id = 1
    
    # Calculate room layout
    num_rooms = len(rooms)
    
    if num_rooms <= 2:
        # Side by side
        cols, rows = 2, 1
    elif num_rooms <= 4:
        # 2x2 grid
        cols, rows = 2, 2
    elif num_rooms <= 6:
        # 3x2 grid
        cols, rows = 3, 2
    else:
        # 3x3 or more
        cols = 3
        rows = math.ceil(num_rooms / cols)
    
    cell_width = width_cm // cols
    cell_height = height_cm // rows
    
    # Create outer walls first
    outer_vertices = [
        (x1, y1), (x2, y1), (x2, y2), (x1, y2)
    ]
    
    # Add outer vertices
    outer_v_ids = []
    for i, (x, y) in enumerate(outer_vertices):
        vid = f"v{vertex_id}"
        vertices[vid] = create_vertex(vid, x, y, [])
        outer_v_ids.append(vid)
        vertex_id += 1
    
    # Add outer walls
    outer_wall_ids = []
    for i in range(4):
        wid = f"w{wall_id}"
        v1 = outer_v_ids[i]
        v2 = outer_v_ids[(i + 1) % 4]
        walls[wid] = create_wall(wid, v1, v2, [])
        
        # Update vertex connections
        vertices[v1]["lines"].append(wid)
        vertices[v2]["lines"].append(wid)
        
        outer_wall_ids.append(wid)
        wall_id += 1
    
    # Add entrance door on first wall (bottom)
    entrance_id = f"door{door_id}"
    holes[entrance_id] = create_door(entrance_id, outer_wall_ids[0], 0.3, 100)
    walls[outer_wall_ids[0]]["holes"].append(entrance_id)
    door_id += 1
    
    # Add windows on outer walls (right and top)
    for wall_idx in [1, 2]:  # Right and top walls
        for offset in [0.3, 0.7]:
            win_id = f"win{window_id}"
            holes[win_id] = create_window(win_id, outer_wall_ids[wall_idx], offset)
            walls[outer_wall_ids[wall_idx]]["holes"].append(win_id)
            window_id += 1
    
    # Create interior walls based on grid
    interior_vertices = {}
    
    # Vertical interior walls
    for col in range(1, cols):
        x = x1 + col * cell_width
        for row_seg in range(rows):
            y_start = y1 + row_seg * cell_height
            y_end = y1 + (row_seg + 1) * cell_height
            
            # Create vertices
            v1_id = f"v{vertex_id}"
            vertices[v1_id] = create_vertex(v1_id, x, y_start, [])
            vertex_id += 1
            
            v2_id = f"v{vertex_id}"
            vertices[v2_id] = create_vertex(v2_id, x, y_end, [])
            vertex_id += 1
            
            # Create wall
            wid = f"w{wall_id}"
            walls[wid] = create_wall(wid, v1_id, v2_id, [])
            vertices[v1_id]["lines"].append(wid)
            vertices[v2_id]["lines"].append(wid)
            
            # Add door to this wall
            door_wid = f"door{door_id}"
            holes[door_wid] = create_door(door_wid, wid, 0.5, 80)
            walls[wid]["holes"].append(door_wid)
            door_id += 1
            
            wall_id += 1
    
    # Horizontal interior walls
    for row in range(1, rows):
        y = y1 + row * cell_height
        for col_seg in range(cols):
            x_start = x1 + col_seg * cell_width
            x_end = x1 + (col_seg + 1) * cell_width
            
            # Create vertices
            v1_id = f"v{vertex_id}"
            vertices[v1_id] = create_vertex(v1_id, x_start, y, [])
            vertex_id += 1
            
            v2_id = f"v{vertex_id}"
            vertices[v2_id] = create_vertex(v2_id, x_end, y, [])
            vertex_id += 1
            
            # Create wall
            wid = f"w{wall_id}"
            walls[wid] = create_wall(wid, v1_id, v2_id, [])
            vertices[v1_id]["lines"].append(wid)
            vertices[v2_id]["lines"].append(wid)
            
            # Add door to this wall
            door_wid = f"door{door_id}"
            holes[door_wid] = create_door(door_wid, wid, 0.5, 80)
            walls[wid]["holes"].append(door_wid)
            door_id += 1
            
            wall_id += 1
    
    layer["vertices"] = vertices
    layer["lines"] = walls
    layer["holes"] = holes
    
    return design

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
                "selected": {"vertices":[],"lines":[],"holes":[],"areas":[],"items":[]}
            }
        },
        "grids": {
            "h1": {"id":"h1","type":"horizontal-streak","properties":{"step":20,"colors":["#808080","#ddd","#ddd","#ddd","#ddd"]}},
            "v1": {"id":"v1","type":"vertical-streak","properties":{"step":20,"colors":["#808080","#ddd","#ddd","#ddd","#ddd"]}}
        },
        "selectedLayer": "layer-1",
        "groups": {},
        "width": 3000,
        "height": 2000,
        "meta": {},
        "guides": {"horizontal":{},"vertical":{},"circular":{}}
    }

def create_vertex(vid, x, y, lines):
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
        "lines": lines,
        "areas": []
    }

def create_wall(wid, v1, v2, holes=None):
    """Create a wall object"""
    return {
        "id": wid,
        "type": "wall",
        "prototype": "lines",
        "name": "Wall",
        "misc": {},
        "selected": False,
        "properties": {
            "height": {"length": 300},
            "thickness": {"length": 20},
            "textureA": "bricks",
            "textureB": "bricks"
        },
        "visible": True,
        "vertices": [v1, v2],
        "holes": holes or []
    }

def create_door(did, wall_id, offset=0.5, width=80):
    """Create a door object"""
    return {
        "id": did,
        "type": "door",
        "prototype": "holes",
        "name": "Door",
        "misc": {},
        "selected": False,
        "properties": {
            "width": {"length": width},
            "height": {"length": 215},
            "altitude": {"length": 0},
            "thickness": {"length": 30}
        },
        "visible": True,
        "offset": offset,
        "line": wall_id
    }

def create_window(wid, wall_id, offset=0.5, width=120):
    """Create a window object"""
    return {
        "id": wid,
        "type": "window",
        "prototype": "holes",
        "name": "Window",
        "misc": {},
        "selected": False,
        "properties": {
            "width": {"length": width},
            "height": {"length": 100},
            "altitude": {"length": 90},
            "thickness": {"length": 30}
        },
        "visible": True,
        "offset": offset,
        "line": wall_id
    }

def generate_studio_apartment(width_cm=600, height_cm=500):
    """Generate a studio apartment (open plan with bathroom)"""
    margin = 200
    x1, y1 = margin, margin
    x2, y2 = margin + width_cm, margin + height_cm
    
    # Bathroom in corner (150x150)
    bath_w = min(150, int(width_cm * 0.25))
    bath_h = min(150, int(height_cm * 0.3))
    
    design = create_base_structure()
    layer = design["layers"]["layer-1"]
    
    # Vertices
    layer["vertices"] = {
        "v1": create_vertex("v1", x1, y1, ["w1", "w4"]),
        "v2": create_vertex("v2", x2, y1, ["w1", "w2"]),
        "v3": create_vertex("v3", x2, y2, ["w2", "w3"]),
        "v4": create_vertex("v4", x1, y2, ["w3", "w4"]),
        "v5": create_vertex("v5", x1 + bath_w, y1, ["w1", "w5"]),
        "v6": create_vertex("v6", x1 + bath_w, y1 + bath_h, ["w5", "w6"]),
        "v7": create_vertex("v7", x1, y1 + bath_h, ["w4", "w6"]),
    }
    
    # Walls
    layer["lines"] = {
        "w1": create_wall("w1", "v1", "v2", ["entrance"]),
        "w2": create_wall("w2", "v2", "v3", ["win1"]),
        "w3": create_wall("w3", "v3", "v4", ["win2"]),
        "w4": create_wall("w4", "v4", "v1", []),
        "w5": create_wall("w5", "v5", "v6", ["bath_door"]),
        "w6": create_wall("w6", "v6", "v7", []),
    }
    
    # Holes
    layer["holes"] = {
        "entrance": create_door("entrance", "w1", 0.7, 90),
        "bath_door": create_door("bath_door", "w5", 0.5, 70),
        "win1": create_window("win1", "w2", 0.5),
        "win2": create_window("win2", "w3", 0.5),
    }
    
    return design

def generate_1bedroom_apartment(width_cm=800, height_cm=600):
    """Generate a 1-bedroom apartment"""
    margin = 200
    x1, y1 = margin, margin
    x2, y2 = margin + width_cm, margin + height_cm
    
    # Room divisions
    bedroom_w = int(width_cm * 0.4)
    living_w = width_cm - bedroom_w
    bath_h = int(height_cm * 0.35)
    
    design = create_base_structure()
    layer = design["layers"]["layer-1"]
    
    # Vertices - outer rectangle + interior divisions
    layer["vertices"] = {
        "v1": create_vertex("v1", x1, y1, ["w1", "w4"]),
        "v2": create_vertex("v2", x2, y1, ["w1", "w2"]),
        "v3": create_vertex("v3", x2, y2, ["w2", "w3"]),
        "v4": create_vertex("v4", x1, y2, ["w3", "w4"]),
        # Bedroom wall
        "v5": create_vertex("v5", x1 + living_w, y1, ["w1", "w5"]),
        "v6": create_vertex("v6", x1 + living_w, y2, ["w3", "w5"]),
        # Bathroom corner
        "v7": create_vertex("v7", x2, y1 + bath_h, ["w2", "w6"]),
        "v8": create_vertex("v8", x1 + living_w, y1 + bath_h, ["w5", "w6"]),
    }
    
    # Walls
    layer["lines"] = {
        "w1": create_wall("w1", "v1", "v2", ["entrance"]),
        "w2": create_wall("w2", "v2", "v3", ["win1"]),
        "w3": create_wall("w3", "v3", "v4", ["win2"]),
        "w4": create_wall("w4", "v4", "v1", ["win3"]),
        "w5": create_wall("w5", "v5", "v6", ["bed_door"]),
        "w6": create_wall("w6", "v7", "v8", ["bath_door"]),
    }
    
    # Holes
    layer["holes"] = {
        "entrance": create_door("entrance", "w1", 0.3, 90),
        "bed_door": create_door("bed_door", "w5", 0.6, 80),
        "bath_door": create_door("bath_door", "w6", 0.5, 70),
        "win1": create_window("win1", "w2", 0.7),
        "win2": create_window("win2", "w3", 0.5),
        "win3": create_window("win3", "w4", 0.5),
    }
    
    return design

def generate_2bedroom_apartment(width_cm=1000, height_cm=800):
    """Generate a proper 2-bedroom apartment floor plan programmatically"""
    
    # Calculate room dimensions based on total size
    margin = 200  # Start position from origin
    
    # Define the apartment boundaries
    x_start = margin
    y_start = margin
    x_end = margin + width_cm
    y_end = margin + height_cm
    
    # Calculate room divisions
    living_width = int(width_cm * 0.5)  # 50% for living room
    kitchen_width = int(width_cm * 0.3)  # 30% for kitchen
    bathroom_width = int(width_cm * 0.2)  # 20% for bathroom
    
    bedroom_height = int(height_cm * 0.5)  # Top half for bedrooms
    living_height = int(height_cm * 0.5)  # Bottom half for living/kitchen
    
    # Key coordinates
    mid_x = x_start + living_width
    kitchen_end_x = mid_x + kitchen_width
    mid_y = y_start + living_height
    bedroom_mid_x = x_start + int(width_cm * 0.5)
    
    # Create vertices
    vertices = {
        # Outer corners
        "v1": {"id":"v1","type":"","prototype":"vertices","name":"Vertex","misc":{},"selected":False,"properties":{},"visible":True,"x":x_start,"y":y_start,"lines":["wall1","wall4"],"areas":[]},
        "v2": {"id":"v2","type":"","prototype":"vertices","name":"Vertex","misc":{},"selected":False,"properties":{},"visible":True,"x":x_end,"y":y_start,"lines":["wall1","wall2"],"areas":[]},
        "v3": {"id":"v3","type":"","prototype":"vertices","name":"Vertex","misc":{},"selected":False,"properties":{},"visible":True,"x":x_end,"y":y_end,"lines":["wall2","wall3"],"areas":[]},
        "v4": {"id":"v4","type":"","prototype":"vertices","name":"Vertex","misc":{},"selected":False,"properties":{},"visible":True,"x":x_start,"y":y_end,"lines":["wall3","wall4"],"areas":[]},
        # Interior vertices for room divisions
        "v5": {"id":"v5","type":"","prototype":"vertices","name":"Vertex","misc":{},"selected":False,"properties":{},"visible":True,"x":mid_x,"y":y_start,"lines":["wall1","wall5","wall9"],"areas":[]},
        "v6": {"id":"v6","type":"","prototype":"vertices","name":"Vertex","misc":{},"selected":False,"properties":{},"visible":True,"x":mid_x,"y":mid_y,"lines":["wall5","wall6","wall10"],"areas":[]},
        "v7": {"id":"v7","type":"","prototype":"vertices","name":"Vertex","misc":{},"selected":False,"properties":{},"visible":True,"x":x_start,"y":mid_y,"lines":["wall4","wall6"],"areas":[]},
        "v8": {"id":"v8","type":"","prototype":"vertices","name":"Vertex","misc":{},"selected":False,"properties":{},"visible":True,"x":kitchen_end_x,"y":y_start,"lines":["wall1","wall7"],"areas":[]},
        "v9": {"id":"v9","type":"","prototype":"vertices","name":"Vertex","misc":{},"selected":False,"properties":{},"visible":True,"x":kitchen_end_x,"y":mid_y,"lines":["wall7","wall8","wall10"],"areas":[]},
        "v10": {"id":"v10","type":"","prototype":"vertices","name":"Vertex","misc":{},"selected":False,"properties":{},"visible":True,"x":x_end,"y":mid_y,"lines":["wall2","wall8"],"areas":[]},
        "v11": {"id":"v11","type":"","prototype":"vertices","name":"Vertex","misc":{},"selected":False,"properties":{},"visible":True,"x":bedroom_mid_x,"y":mid_y,"lines":["wall10","wall11"],"areas":[]},
        "v12": {"id":"v12","type":"","prototype":"vertices","name":"Vertex","misc":{},"selected":False,"properties":{},"visible":True,"x":bedroom_mid_x,"y":y_end,"lines":["wall3","wall11"],"areas":[]},
    }
    
    # Create walls
    lines = {
        # Outer walls
        "wall1": {"id":"wall1","type":"wall","prototype":"lines","name":"Wall","misc":{},"selected":False,"properties":{"height":{"length":300},"thickness":{"length":20},"textureA":"bricks","textureB":"bricks"},"visible":True,"vertices":["v1","v2"],"holes":["entrance"]},
        "wall2": {"id":"wall2","type":"wall","prototype":"lines","name":"Wall","misc":{},"selected":False,"properties":{"height":{"length":300},"thickness":{"length":20},"textureA":"bricks","textureB":"bricks"},"visible":True,"vertices":["v2","v3"],"holes":["window1"]},
        "wall3": {"id":"wall3","type":"wall","prototype":"lines","name":"Wall","misc":{},"selected":False,"properties":{"height":{"length":300},"thickness":{"length":20},"textureA":"bricks","textureB":"bricks"},"visible":True,"vertices":["v3","v4"],"holes":["window2","window3"]},
        "wall4": {"id":"wall4","type":"wall","prototype":"lines","name":"Wall","misc":{},"selected":False,"properties":{"height":{"length":300},"thickness":{"length":20},"textureA":"bricks","textureB":"bricks"},"visible":True,"vertices":["v4","v1"],"holes":[]},
        # Interior walls
        "wall5": {"id":"wall5","type":"wall","prototype":"lines","name":"Wall","misc":{},"selected":False,"properties":{"height":{"length":300},"thickness":{"length":20},"textureA":"bricks","textureB":"bricks"},"visible":True,"vertices":["v5","v6"],"holes":["door_kitchen"]},
        "wall6": {"id":"wall6","type":"wall","prototype":"lines","name":"Wall","misc":{},"selected":False,"properties":{"height":{"length":300},"thickness":{"length":20},"textureA":"bricks","textureB":"bricks"},"visible":True,"vertices":["v6","v7"],"holes":["door_living"]},
        "wall7": {"id":"wall7","type":"wall","prototype":"lines","name":"Wall","misc":{},"selected":False,"properties":{"height":{"length":300},"thickness":{"length":20},"textureA":"bricks","textureB":"bricks"},"visible":True,"vertices":["v8","v9"],"holes":["door_bath"]},
        "wall8": {"id":"wall8","type":"wall","prototype":"lines","name":"Wall","misc":{},"selected":False,"properties":{"height":{"length":300},"thickness":{"length":20},"textureA":"bricks","textureB":"bricks"},"visible":True,"vertices":["v9","v10"],"holes":[]},
        "wall9": {"id":"wall9","type":"wall","prototype":"lines","name":"Wall","misc":{},"selected":False,"properties":{"height":{"length":300},"thickness":{"length":20},"textureA":"bricks","textureB":"bricks"},"visible":True,"vertices":["v5","v8"],"holes":[]},
        "wall10": {"id":"wall10","type":"wall","prototype":"lines","name":"Wall","misc":{},"selected":False,"properties":{"height":{"length":300},"thickness":{"length":20},"textureA":"bricks","textureB":"bricks"},"visible":True,"vertices":["v6","v11"],"holes":["door_bed1"]},
        "wall11": {"id":"wall11","type":"wall","prototype":"lines","name":"Wall","misc":{},"selected":False,"properties":{"height":{"length":300},"thickness":{"length":20},"textureA":"bricks","textureB":"bricks"},"visible":True,"vertices":["v11","v12"],"holes":["door_bed2"]},
    }
    
    # Create holes (doors and windows)
    holes = {
        "entrance": {"id":"entrance","type":"door","prototype":"holes","name":"Main Entrance","misc":{},"selected":False,"properties":{"width":{"length":100},"height":{"length":215},"altitude":{"length":0},"thickness":{"length":30}},"visible":True,"offset":0.3,"line":"wall1"},
        "door_kitchen": {"id":"door_kitchen","type":"door","prototype":"holes","name":"Kitchen Door","misc":{},"selected":False,"properties":{"width":{"length":80},"height":{"length":215},"altitude":{"length":0},"thickness":{"length":30}},"visible":True,"offset":0.5,"line":"wall5"},
        "door_living": {"id":"door_living","type":"door","prototype":"holes","name":"Living Room Door","misc":{},"selected":False,"properties":{"width":{"length":80},"height":{"length":215},"altitude":{"length":0},"thickness":{"length":30}},"visible":True,"offset":0.5,"line":"wall6"},
        "door_bath": {"id":"door_bath","type":"door","prototype":"holes","name":"Bathroom Door","misc":{},"selected":False,"properties":{"width":{"length":70},"height":{"length":215},"altitude":{"length":0},"thickness":{"length":30}},"visible":True,"offset":0.5,"line":"wall7"},
        "door_bed1": {"id":"door_bed1","type":"door","prototype":"holes","name":"Bedroom 1 Door","misc":{},"selected":False,"properties":{"width":{"length":80},"height":{"length":215},"altitude":{"length":0},"thickness":{"length":30}},"visible":True,"offset":0.3,"line":"wall10"},
        "door_bed2": {"id":"door_bed2","type":"door","prototype":"holes","name":"Bedroom 2 Door","misc":{},"selected":False,"properties":{"width":{"length":80},"height":{"length":215},"altitude":{"length":0},"thickness":{"length":30}},"visible":True,"offset":0.5,"line":"wall11"},
        "window1": {"id":"window1","type":"window","prototype":"holes","name":"Window","misc":{},"selected":False,"properties":{"width":{"length":120},"height":{"length":100},"altitude":{"length":90},"thickness":{"length":30}},"visible":True,"offset":0.5,"line":"wall2"},
        "window2": {"id":"window2","type":"window","prototype":"holes","name":"Window","misc":{},"selected":False,"properties":{"width":{"length":120},"height":{"length":100},"altitude":{"length":90},"thickness":{"length":30}},"visible":True,"offset":0.25,"line":"wall3"},
        "window3": {"id":"window3","type":"window","prototype":"holes","name":"Window","misc":{},"selected":False,"properties":{"width":{"length":120},"height":{"length":100},"altitude":{"length":90},"thickness":{"length":30}},"visible":True,"offset":0.75,"line":"wall3"},
    }
    
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
                "vertices": vertices,
                "lines": lines,
                "holes": holes,
                "areas": {},
                "items": {},
                "selected": {"vertices":[],"lines":[],"holes":[],"areas":[],"items":[]}
            }
        },
        "grids": {
            "h1": {"id":"h1","type":"horizontal-streak","properties":{"step":20,"colors":["#808080","#ddd","#ddd","#ddd","#ddd"]}},
            "v1": {"id":"v1","type":"vertical-streak","properties":{"step":20,"colors":["#808080","#ddd","#ddd","#ddd","#ddd"]}}
        },
        "selectedLayer": "layer-1",
        "groups": {},
        "width": 3000,
        "height": 2000,
        "meta": {},
        "guides": {"horizontal":{},"vertical":{},"circular":{}}
    }

def generate_3bedroom_apartment(width_cm=1200, height_cm=1000):
    """Generate a 3-bedroom apartment"""
    margin = 200
    x1, y1 = margin, margin
    x2, y2 = margin + width_cm, margin + height_cm
    
    # Divide into zones
    living_w = int(width_cm * 0.45)
    bed_zone_w = width_cm - living_w
    
    top_h = int(height_cm * 0.5)
    bottom_h = height_cm - top_h
    
    bed1_w = int(bed_zone_w * 0.5)
    
    design = create_base_structure()
    layer = design["layers"]["layer-1"]
    
    # Vertices
    layer["vertices"] = {
        # Outer
        "v1": create_vertex("v1", x1, y1, ["w1", "w8"]),
        "v2": create_vertex("v2", x2, y1, ["w1", "w2"]),
        "v3": create_vertex("v3", x2, y2, ["w2", "w3"]),
        "v4": create_vertex("v4", x1, y2, ["w3", "w8"]),
        # Living/bedroom division
        "v5": create_vertex("v5", x1 + living_w, y1, ["w1", "w4"]),
        "v6": create_vertex("v6", x1 + living_w, y2, ["w3", "w4"]),
        # Horizontal division
        "v7": create_vertex("v7", x1, y1 + bottom_h, ["w8", "w5"]),
        "v8": create_vertex("v8", x1 + living_w, y1 + bottom_h, ["w4", "w5", "w6"]),
        "v9": create_vertex("v9", x2, y1 + bottom_h, ["w2", "w6"]),
        # Bedroom 2/3 division
        "v10": create_vertex("v10", x1 + living_w + bed1_w, y1, ["w1", "w7"]),
        "v11": create_vertex("v11", x1 + living_w + bed1_w, y1 + bottom_h, ["w6", "w7"]),
    }
    
    # Walls
    layer["lines"] = {
        "w1": create_wall("w1", "v1", "v2", ["entrance"]),
        "w2": create_wall("w2", "v2", "v3", ["win1", "win2"]),
        "w3": create_wall("w3", "v3", "v4", ["win3", "win4"]),
        "w4": create_wall("w4", "v5", "v6", ["bed1_door"]),
        "w5": create_wall("w5", "v7", "v8", ["kitchen_door"]),
        "w6": create_wall("w6", "v8", "v9", ["bed2_door", "bed3_door"]),
        "w7": create_wall("w7", "v10", "v11", ["bath_door"]),
        "w8": create_wall("w8", "v4", "v1", ["win5"]),
    }
    
    # Holes
    layer["holes"] = {
        "entrance": create_door("entrance", "w1", 0.2, 100),
        "bed1_door": create_door("bed1_door", "w4", 0.3, 80),
        "kitchen_door": create_door("kitchen_door", "w5", 0.5, 80),
        "bed2_door": create_door("bed2_door", "w6", 0.25, 80),
        "bed3_door": create_door("bed3_door", "w6", 0.75, 80),
        "bath_door": create_door("bath_door", "w7", 0.5, 70),
        "win1": create_window("win1", "w2", 0.25),
        "win2": create_window("win2", "w2", 0.75),
        "win3": create_window("win3", "w3", 0.25),
        "win4": create_window("win4", "w3", 0.75),
        "win5": create_window("win5", "w8", 0.5),
    }
    
    return design

def generate_office(width_cm=1000, height_cm=800):
    """Generate an office layout with reception, offices, meeting room"""
    margin = 200
    x1, y1 = margin, margin
    x2, y2 = margin + width_cm, margin + height_cm
    
    # Divide into zones
    reception_h = int(height_cm * 0.3)
    office_w = int(width_cm * 0.35)
    meeting_w = int(width_cm * 0.35)
    
    design = create_base_structure()
    layer = design["layers"]["layer-1"]
    
    # Vertices
    layer["vertices"] = {
        # Outer
        "v1": create_vertex("v1", x1, y1, ["w1", "w6"]),
        "v2": create_vertex("v2", x2, y1, ["w1", "w2"]),
        "v3": create_vertex("v3", x2, y2, ["w2", "w3"]),
        "v4": create_vertex("v4", x1, y2, ["w3", "w6"]),
        # Reception division
        "v5": create_vertex("v5", x1, y1 + reception_h, ["w6", "w4"]),
        "v6": create_vertex("v6", x2, y1 + reception_h, ["w2", "w4"]),
        # Office divisions
        "v7": create_vertex("v7", x1 + office_w, y1 + reception_h, ["w4", "w5"]),
        "v8": create_vertex("v8", x1 + office_w, y2, ["w3", "w5"]),
        "v9": create_vertex("v9", x1 + office_w + meeting_w, y1 + reception_h, ["w4", "w7"]),
        "v10": create_vertex("v10", x1 + office_w + meeting_w, y2, ["w3", "w7"]),
    }
    
    # Walls
    layer["lines"] = {
        "w1": create_wall("w1", "v1", "v2", ["main_entrance"]),
        "w2": create_wall("w2", "v2", "v3", ["win1", "win2"]),
        "w3": create_wall("w3", "v3", "v4", ["win3", "win4"]),
        "w4": create_wall("w4", "v5", "v6", ["office1_door", "meeting_door", "office2_door"]),
        "w5": create_wall("w5", "v7", "v8", []),
        "w6": create_wall("w6", "v4", "v1", ["win5"]),
        "w7": create_wall("w7", "v9", "v10", []),
    }
    
    # Holes
    layer["holes"] = {
        "main_entrance": create_door("main_entrance", "w1", 0.5, 120),
        "office1_door": create_door("office1_door", "w4", 0.15, 80),
        "meeting_door": create_door("meeting_door", "w4", 0.5, 90),
        "office2_door": create_door("office2_door", "w4", 0.85, 80),
        "win1": create_window("win1", "w2", 0.3),
        "win2": create_window("win2", "w2", 0.7),
        "win3": create_window("win3", "w3", 0.3),
        "win4": create_window("win4", "w3", 0.7),
        "win5": create_window("win5", "w6", 0.5),
    }
    
    return design

def generate_classroom(width_cm=1000, height_cm=800):
    """Generate a classroom layout"""
    margin = 200
    x1, y1 = margin, margin
    x2, y2 = margin + width_cm, margin + height_cm
    
    design = create_base_structure()
    layer = design["layers"]["layer-1"]
    
    # Simple rectangular room
    layer["vertices"] = {
        "v1": create_vertex("v1", x1, y1, ["w1", "w4"]),
        "v2": create_vertex("v2", x2, y1, ["w1", "w2"]),
        "v3": create_vertex("v3", x2, y2, ["w2", "w3"]),
        "v4": create_vertex("v4", x1, y2, ["w3", "w4"]),
    }
    
    layer["lines"] = {
        "w1": create_wall("w1", "v1", "v2", ["entrance"]),
        "w2": create_wall("w2", "v2", "v3", ["win1", "win2", "win3"]),
        "w3": create_wall("w3", "v3", "v4", []),
        "w4": create_wall("w4", "v4", "v1", ["win4", "win5"]),
    }
    
    layer["holes"] = {
        "entrance": create_door("entrance", "w1", 0.1, 100),
        "win1": create_window("win1", "w2", 0.2),
        "win2": create_window("win2", "w2", 0.5),
        "win3": create_window("win3", "w2", 0.8),
        "win4": create_window("win4", "w4", 0.3),
        "win5": create_window("win5", "w4", 0.7),
    }
    
    return design

def generate_floor_plan(design_type, width_cm, height_cm, bedrooms=2):
    """Generate the appropriate floor plan based on type"""
    design_type = design_type.lower().strip()
    
    if 'studio' in design_type:
        return generate_studio_apartment(width_cm, height_cm)
    elif 'office' in design_type:
        return generate_office(width_cm, height_cm)
    elif 'class' in design_type or 'school' in design_type:
        return generate_classroom(width_cm, height_cm)
    elif bedrooms == 1 or '1' in design_type or 'one' in design_type:
        return generate_1bedroom_apartment(width_cm, height_cm)
    elif bedrooms == 3 or '3' in design_type or 'three' in design_type:
        return generate_3bedroom_apartment(width_cm, height_cm)
    else:
        # Default to 2 bedroom
        return generate_2bedroom_apartment(width_cm, height_cm)

def validate_and_fix_design(design_json, min_doors=5, min_windows=2):
    """Validate and fix common issues in AI-generated designs.
    Returns None if the design is too broken to be useful."""
    if not design_json or 'layers' not in design_json:
        return None
    
    layer = design_json.get('layers', {}).get('layer-1', {})
    vertices = layer.get('vertices', {})
    lines = layer.get('lines', {})
    holes = layer.get('holes', {})
    
    # Check if we have minimum required elements for a proper apartment
    if len(vertices) < 8:  # Need at least 8 vertices for 2 rooms
        return None
    if len(lines) < 6:  # Need at least 6 walls for 2 rooms
        return None
    
    # Count doors and windows
    door_count = 0
    window_count = 0
    for hole_id, hole in holes.items():
        hole_type = hole.get('type', '')
        if hole_type in ['door', 'gate', 'sliding door', 'double door']:
            door_count += 1
        elif hole_type in ['window', 'sash window']:
            window_count += 1
    
    # A proper 2-bedroom apartment needs at least 5 doors and 2 windows
    if door_count < min_doors or window_count < min_windows:
        return None  # Not enough doors/windows - use programmatic fallback
    
    # Fix vertex-line references
    for line_id, line in lines.items():
        line_vertices = line.get('vertices', [])
        for v_id in line_vertices:
            if v_id in vertices:
                vertex = vertices[v_id]
                if line_id not in vertex.get('lines', []):
                    if 'lines' not in vertex:
                        vertex['lines'] = []
                    vertex['lines'].append(line_id)
    
    # Fix hole-line references
    for hole_id, hole in holes.items():
        line_id = hole.get('line')
        if line_id and line_id in lines:
            line = lines[line_id]
            if hole_id not in line.get('holes', []):
                if 'holes' not in line:
                    line['holes'] = []
                line['holes'].append(hole_id)
    
    return design_json

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
        
        # Check if the response is a JSON design
        is_design = False
        design_json = None
        
        # Check if AI signaled to generate design
        if '[GENERATE_DESIGN]' in assistant_message:
            # Remove the signal from the message
            assistant_message = assistant_message.replace('[GENERATE_DESIGN]', '').strip()
            
            # Use AI to extract requirements and build floor plan
            requirements = extract_requirements_with_ai(conversations[session_id])
            design_json = smart_floor_plan_builder(requirements)
            is_design = True
        else:
            # Check if the response contains JSON
            try:
                message_to_parse = assistant_message.strip()
                
                # Remove markdown code block if present
                if message_to_parse.startswith('```json'):
                    message_to_parse = message_to_parse[7:]
                elif message_to_parse.startswith('```'):
                    message_to_parse = message_to_parse[3:]
                
                if message_to_parse.endswith('```'):
                    message_to_parse = message_to_parse[:-3]
                
                message_to_parse = message_to_parse.strip()
                
                if message_to_parse.startswith('{'):
                    design_json = json.loads(message_to_parse)
                    if 'layers' in design_json and 'unit' in design_json:
                        design_json = validate_and_fix_design(design_json)
                        if design_json:
                            is_design = True
                        else:
                            # Invalid design, use smart builder
                            requirements = extract_requirements_with_ai(conversations[session_id])
                            design_json = smart_floor_plan_builder(requirements)
                            is_design = True
            except json.JSONDecodeError:
                pass
        
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

def extract_requirements_from_conversation(conversation):
    """Extract design requirements from conversation history"""
    import re
    
    width_cm = 1000  # Default 10m
    height_cm = 800  # Default 8m
    bedrooms = 2  # Default 2 bedrooms
    design_type = "apartment"  # Default type
    
    for msg in conversation:
        content = msg.get('content', '').lower()
        
        # Extract design type
        if 'studio' in content:
            design_type = "studio"
            bedrooms = 0
        elif 'office' in content:
            design_type = "office"
        elif 'classroom' in content or 'class room' in content or 'school' in content:
            design_type = "classroom"
        elif 'restaurant' in content:
            design_type = "restaurant"
        
        # Extract dimensions
        # Match patterns like "10m x 8m", "10 m by 8 m", "10x8 meters"
        dim_patterns = [
            r'(\d+)\s*m?\s*[xX×]\s*(\d+)\s*m',
            r'(\d+)\s*m\s*by\s*(\d+)\s*m',
            r'(\d+)\s*meters?\s*[xX×by]\s*(\d+)',
        ]
        for pattern in dim_patterns:
            match = re.search(pattern, content)
            if match:
                width_cm = int(match.group(1)) * 100
                height_cm = int(match.group(2)) * 100
                break
        
        # Extract bedroom count
        bedroom_patterns = [
            r'(\d+)\s*bed\s*room',
            r'(\d+)\s*bedroom',
            r'(\d+)\s*-\s*bedroom',
            r'(\d+)\s*br\b',
        ]
        for pattern in bedroom_patterns:
            match = re.search(pattern, content)
            if match:
                bedrooms = int(match.group(1))
                break
        
        # Also check for written numbers
        if 'one bedroom' in content or 'single bedroom' in content or '1 bedroom' in content or '1-bedroom' in content:
            bedrooms = 1
        elif 'two bedroom' in content or '2 bedroom' in content or '2-bedroom' in content:
            bedrooms = 2
        elif 'three bedroom' in content or '3 bedroom' in content or '3-bedroom' in content:
            bedrooms = 3
    
    return width_cm, height_cm, bedrooms, design_type

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
        
        # Generate description
        space_type = requirements.get('space_type', 'apartment')
        width = requirements.get('width_meters', 10)
        height = requirements.get('height_meters', 8)
        bedrooms = requirements.get('num_bedrooms', 2)
        
        desc = f"I've generated a {space_type} floor plan ({width}m x {height}m)"
        if bedrooms > 0 and space_type in ['apartment', 'flat', 'house']:
            desc += f" with {bedrooms} bedroom(s)"
        desc += ". The design includes all the rooms you requested with proper doors and windows."
        
        # Add to conversation history
        conversations[session_id].append({
            "role": "assistant",
            "content": desc
        })
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'design': design_json
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
        'service': 'Archify AI Design Assistant'
    })

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
                'num_bedrooms': data.get('bedrooms', 2),
                'num_bathrooms': data.get('bathrooms', 1),
                'rooms': data.get('rooms', [])
            }
        
        # Build the floor plan
        design_json = smart_floor_plan_builder(requirements)
        
        return jsonify({
            'success': True,
            'design': design_json,
            'requirements': requirements
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/example-design', methods=['GET'])
def example_design():
    """Return an example design JSON for testing"""
    example = {
        "unit": "cm",
        "layers": {
            "layer-1": {
                "id": "layer-1",
                "altitude": 0,
                "order": 0,
                "opacity": 1,
                "name": "default",
                "visible": True,
                "vertices": {
                    "vertex-1": {"id": "vertex-1", "type": "", "prototype": "vertices", "name": "Vertex", "x": 0, "y": 0, "selected": False, "lines": ["line-1", "line-4"], "areas": []},
                    "vertex-2": {"id": "vertex-2", "type": "", "prototype": "vertices", "name": "Vertex", "x": 500, "y": 0, "selected": False, "lines": ["line-1", "line-2"], "areas": []},
                    "vertex-3": {"id": "vertex-3", "type": "", "prototype": "vertices", "name": "Vertex", "x": 500, "y": 400, "selected": False, "lines": ["line-2", "line-3"], "areas": []},
                    "vertex-4": {"id": "vertex-4", "type": "", "prototype": "vertices", "name": "Vertex", "x": 0, "y": 400, "selected": False, "lines": ["line-3", "line-4"], "areas": []}
                },
                "lines": {
                    "line-1": {"id": "line-1", "type": "wall", "prototype": "lines", "name": "Wall", "vertices": ["vertex-1", "vertex-2"], "selected": False, "properties": {"height": {"length": 300}, "thickness": {"length": 20}}, "holes": []},
                    "line-2": {"id": "line-2", "type": "wall", "prototype": "lines", "name": "Wall", "vertices": ["vertex-2", "vertex-3"], "selected": False, "properties": {"height": {"length": 300}, "thickness": {"length": 20}}, "holes": ["hole-1"]},
                    "line-3": {"id": "line-3", "type": "wall", "prototype": "lines", "name": "Wall", "vertices": ["vertex-3", "vertex-4"], "selected": False, "properties": {"height": {"length": 300}, "thickness": {"length": 20}}, "holes": ["hole-2"]},
                    "line-4": {"id": "line-4", "type": "wall", "prototype": "lines", "name": "Wall", "vertices": ["vertex-4", "vertex-1"], "selected": False, "properties": {"height": {"length": 300}, "thickness": {"length": 20}}, "holes": []}
                },
                "holes": {
                    "hole-1": {"id": "hole-1", "type": "door", "prototype": "holes", "name": "Door", "offset": 0.5, "line": "line-2", "selected": False, "properties": {"width": {"length": 90}, "height": {"length": 215}, "altitude": {"length": 0}}},
                    "hole-2": {"id": "hole-2", "type": "window", "prototype": "holes", "name": "Window", "offset": 0.5, "line": "line-3", "selected": False, "properties": {"width": {"length": 120}, "height": {"length": 100}, "altitude": {"length": 90}}}
                },
                "areas": {},
                "items": {
                    "item-1": {"id": "item-1", "type": "sofa", "prototype": "items", "name": "Sofa", "x": 250, "y": 300, "rotation": 0, "selected": False, "properties": {}},
                    "item-2": {"id": "item-2", "type": "table", "prototype": "items", "name": "Table", "x": 250, "y": 200, "rotation": 0, "selected": False, "properties": {}}
                },
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
    
    return jsonify({
        'success': True,
        'design': example
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

