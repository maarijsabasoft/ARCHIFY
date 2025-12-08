import json
import math
import random
from collections import defaultdict

from config import Config

# Store conversation history per session (could be moved to a database later)
conversations = {}

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
        template = Config.PROFESSIONAL_CONFIG["space_templates"].get(space_type, ["generic", "generic", "storage"])

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

def generate_unique_id(prefix=""):
    """Generate a unique ID similar to the example format"""
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    if prefix:
        return f"{prefix}-{''.join(random.choice(chars) for _ in range(10))}"
    return ''.join(random.choice(chars) for _ in range(11))

def extract_requirements_with_ai(user_messages, client):
    """Use AI to extract floor plan requirements from conversation"""
    # Combine all user messages
    combined = " ".join([msg.get('content', '') for msg in user_messages if msg.get('role') == 'user'])

    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": Config.EXTRACTION_PROMPT},
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
