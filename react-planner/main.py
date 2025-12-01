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
from groq import Groq

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

# React-planner JSON structure template
REACT_PLANNER_STRUCTURE = """
CRITICAL ID RULE - The object KEY MUST MATCH the "id" field inside!
Example: "abc123XYZ99": { "id": "abc123XYZ99", ... }

=== WHAT TO GENERATE ===

YOU MUST GENERATE:
1. VERTICES - corner points of walls
2. LINES (walls) - connecting vertices to form rooms
3. HOLES (doors/windows) - placed on walls

DO NOT GENERATE (leave as empty objects):
- "areas": {} - auto-detected by planner
- "items": {} - users add furniture manually in the editor

=== AVAILABLE HOLE TYPES ===
- door (standard single door)
- double door (double door)
- sliding door
- window (standard window)
- sash window
- gate

=== JSON FORMATS ===

VERTEX: {"id":"abc123XYZ99","type":"","prototype":"vertices","name":"Vertex","misc":{},"selected":false,"properties":{},"visible":true,"x":500,"y":400,"lines":["lineId1"],"areas":[]}

LINE/WALL: {"id":"def456ABC11","type":"wall","prototype":"lines","name":"Wall","misc":{},"selected":false,"properties":{"height":{"length":300},"thickness":{"length":20},"textureA":"bricks","textureB":"bricks"},"visible":true,"vertices":["vertexId1","vertexId2"],"holes":[]}

HOLE: {"id":"ghi789DEF22","type":"door","prototype":"holes","name":"Door","misc":{},"selected":false,"properties":{"width":{"length":90},"height":{"length":215},"altitude":{"length":0},"thickness":{"length":30}},"visible":true,"offset":0.5,"line":"lineId"}

=== CRITICAL RULES ===
1. Object KEY must match "id" field inside
2. Use random 11-char alphanumeric IDs (like "soY0e7YWRBS")
3. All measurements in centimeters (10m = 1000cm)
4. Use "bricks" texture for all walls
5. Leave "areas" as empty object: "areas": {}
6. Leave "items" as empty object: "items": {}
7. Each vertex's "lines" array must list ALL connected wall IDs
8. Each line's "holes" array must list ALL door/window IDs on that wall
9. Each hole's "line" must reference the wall ID it's placed on

=== ROOM LAYOUT REQUIREMENTS ===

1 BEDROOM APARTMENT must have:
- Living Room (with door, windows)
- Kitchen (with door)
- 1 Bedroom (with door, window)
- 1 Bathroom (with door)
- Hallway connecting rooms

2 BEDROOM APARTMENT must have:
- Living Room (with door, windows)
- Kitchen (with door)
- Bedroom 1 (with door, window)
- Bedroom 2 (with door, window)
- 1-2 Bathrooms (with doors)
- Hallway connecting rooms

3 BEDROOM APARTMENT must have:
- Living Room (with door, windows)
- Kitchen (with door)
- Bedroom 1 (with door, window)
- Bedroom 2 (with door, window)
- Bedroom 3 (with door, window)
- 2 Bathrooms (with doors)
- Hallway connecting rooms

OFFICE must have:
- Reception area (with main entrance)
- Open office area or private offices
- Meeting/Conference room
- Kitchen/Break room
- Restrooms

CLASSROOM must have:
- Main teaching area (large room)
- Teacher area at front
- Windows on exterior walls

RESTAURANT must have:
- Dining area (large)
- Kitchen area
- Restrooms
- Storage

=== FULL JSON STRUCTURE ===
{
  "unit": "cm",
  "layers": {
    "layer-1": {
      "id": "layer-1",
      "altitude": 0,
      "order": 0,
      "opacity": 1,
      "name": "default",
      "visible": true,
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

ROOM SIZE GUIDELINES (cm):
- Bedroom: 350x350 to 450x400
- Living Room: 450x400 to 600x500
- Kitchen: 300x300 to 400x350
- Bathroom: 200x200 to 300x250
- Classroom: 800x700 to 1000x800
- Office: 300x300 to 400x400
"""

# System prompt for the design assistant
SYSTEM_PROMPT = f"""You are Archify AI, an expert interior design assistant. You create COMPLETE floor plans with walls, doors, and windows. Users add furniture manually after loading the design.

{REACT_PLANNER_STRUCTURE}

CONVERSATION RULES:
1. Ask what type of space (apartment, office, school, restaurant, etc.)
2. Ask dimensions (in meters)
3. Ask specific requirements (number of bedrooms, etc.)
4. After 2-3 questions, GENERATE the design immediately

CRITICAL - FOLLOW USER REQUIREMENTS EXACTLY:
- "2 bedrooms" -> Create EXACTLY 2 separate bedroom rooms with walls and doors
- "3 bedrooms" -> Create EXACTLY 3 separate bedroom rooms with walls and doors
- "office" -> Create reception, work areas, meeting room, kitchen, restrooms
- "classroom" -> Create large teaching space with windows

GENERATION CHECKLIST:

FOR 2-BEDROOM APARTMENT (example 12m x 10m = 1200cm x 1000cm):
[ ] 4 outer walls forming closed 1200x1000 rectangle
[ ] Living room ~500x400cm (interior walls separating it)
[ ] Kitchen ~350x300cm (interior walls separating it)
[ ] Bedroom 1 ~400x350cm (interior walls separating it)
[ ] Bedroom 2 ~400x350cm (interior walls separating it)
[ ] Bathroom ~250x200cm (interior walls separating it)
[ ] Hallway/corridor connecting all rooms
[ ] Main entrance door on outer wall
[ ] Interior door for EACH room (living, kitchen, bedroom1, bedroom2, bathroom)
[ ] Windows on outer walls (2-4 windows)

FOR OFFICES:
[ ] Outer walls forming closed rectangle
[ ] Reception area near entrance
[ ] Work area(s)
[ ] Meeting/conference room
[ ] Kitchen/break room
[ ] Restrooms
[ ] Door for each room
[ ] Windows on outer walls

FOR CLASSROOMS:
[ ] Large rectangular room
[ ] Main entrance door
[ ] Multiple windows for natural light

JSON OUTPUT RULES:
- Object KEY must match "id" field (e.g., "abc123": {{"id": "abc123", ...}})
- Use random 11-char alphanumeric IDs
- All measurements in centimeters
- Use "bricks" texture for walls
- Leave "areas": {{}} (empty - auto-detected)
- Leave "items": {{}} (empty - users add furniture manually)

When user confirms to generate, respond with ONLY the JSON - no other text.

INTERIOR WALLS REQUIRED:
- Wall separating living room from bedrooms
- Wall separating kitchen from living room
- Wall separating bedroom 1 from bedroom 2
- Wall separating bathroom from other rooms
- Each room must be fully enclosed

DOORS REQUIRED (type: "gate"):
- 1 main entrance door on outer wall
- 1 door to living room (if separate from entrance)
- 1 door to kitchen
- 1 door to bedroom 1
- 1 door to bedroom 2
- 1 door to bathroom
Total: 5-6 interior doors + 1 main entrance

WINDOWS REQUIRED:
- 2-3 windows on outer walls (living room, bedrooms)
- Windows should be on walls opposite to or perpendicular to entrance

FURNITURE TO INCLUDE:
- Living room: sofa, tv
- Kitchen: kitchen, fridge

GENERATION CHECKLIST - VERIFY BEFORE OUTPUT:
[ ] Outer boundary complete (4 walls, closed rectangle)
[ ] All rooms have walls (living, kitchen, 2 bedrooms, bathroom)
[ ] Main entrance door exists
[ ] Each room has a door for access
[ ] Windows on outer walls
[ ] Furniture in living room and kitchen
[ ] All vertex IDs are random 11-char alphanumeric
[ ] All vertices list their connected lines
[ ] All lines with doors list the hole IDs

COORDINATE LAYOUT EXAMPLE (2-bedroom, 1200x1000cm):
Bottom-left corner at (100, 100), so apartment spans (100,100) to (1300,1100)

Outer corners:
- v1: (100, 100) - bottom-left
- v2: (1300, 100) - bottom-right  
- v3: (1300, 1100) - top-right
- v4: (100, 1100) - top-left

Room layout (approximate):
- Living room: bottom-left area (100,100) to (600,600)
- Kitchen: bottom-right area (600,100) to (1000,400)
- Bedroom 1: top-left area (100,600) to (500,1100)
- Bedroom 2: top-right area (700,600) to (1300,1100)
- Bathroom: middle-right area (1000,100) to (1300,400)
- Hallway: center connecting area

If the user asks you to generate the design, respond with ONLY the valid JSON object, no additional text.
"""

def generate_unique_id(prefix):
    """Generate a unique ID with a prefix"""
    return f"{prefix}-{uuid.uuid4().hex[:8]}"

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
        
        try:
            # Extract JSON from the response (handle markdown code blocks)
            message_to_parse = assistant_message.strip()
            
            # Remove markdown code block if present
            if message_to_parse.startswith('```json'):
                message_to_parse = message_to_parse[7:]  # Remove ```json
            elif message_to_parse.startswith('```'):
                message_to_parse = message_to_parse[3:]  # Remove ```
            
            if message_to_parse.endswith('```'):
                message_to_parse = message_to_parse[:-3]  # Remove trailing ```
            
            message_to_parse = message_to_parse.strip()
            
            # Try to parse as JSON to check if it's a design
            if message_to_parse.startswith('{'):
                design_json = json.loads(message_to_parse)
                # Verify it's a react-planner design (has layers)
                if 'layers' in design_json and 'unit' in design_json:
                    is_design = True
                else:
                    design_json = None
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

@app.route('/api/generate-design', methods=['POST'])
def generate_design():
    """Force generate a design based on conversation history"""
    try:
        data = request.json
        session_id = data.get('session_id')
        
        if not session_id or session_id not in conversations:
            return jsonify({
                'success': False,
                'error': 'Invalid session or no conversation history'
            }), 400
        
        # Add a request to generate the design
        conversations[session_id].append({
            "role": "user",
            "content": "Please generate the floor plan design now. Respond with ONLY the JSON object, no additional text or explanation."
        })
        
        # Call Groq API with explicit JSON request
        chat_completion = client.chat.completions.create(
            messages=conversations[session_id],
            model="llama-3.3-70b-versatile",
            temperature=0.3,  # Lower temperature for more consistent JSON
            max_tokens=8000,
        )
        
        assistant_message = chat_completion.choices[0].message.content
        
        # Try to extract JSON from the response
        design_json = None
        try:
            # Handle case where JSON might be wrapped in markdown code blocks
            json_str = assistant_message.strip()
            if json_str.startswith('```json'):
                json_str = json_str[7:]
            if json_str.startswith('```'):
                json_str = json_str[3:]
            if json_str.endswith('```'):
                json_str = json_str[:-3]
            json_str = json_str.strip()
            
            design_json = json.loads(json_str)
        except json.JSONDecodeError as e:
            return jsonify({
                'success': False,
                'error': f'Failed to parse design JSON: {str(e)}',
                'raw_response': assistant_message
            }), 500
        
        # Add to conversation history
        conversations[session_id].append({
            "role": "assistant",
            "content": assistant_message
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

