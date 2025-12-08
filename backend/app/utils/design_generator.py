import json
import math
import random
from collections import defaultdict

from config import Config
from .design_utils import generate_unique_id

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
            "height": {"length": Config.PROFESSIONAL_CONFIG["wall_height"]},
            "thickness": {"length": Config.PROFESSIONAL_CONFIG["wall_thickness"]},
            "textureA": Config.PROFESSIONAL_CONFIG["wall_texture_a"],  # From config
            "textureB": Config.PROFESSIONAL_CONFIG["wall_texture_b"]   # From config
        },
        "visible": True,
        "vertices": [v1, v2],
        "holes": []
    }

def create_door(did, wall_id, offset=0.5, width=None, is_main_entrance=False):
    """Create a door object - only main entrance is sliding door"""
    if width is None:
        width = Config.PROFESSIONAL_CONFIG["door_width"]

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
                "height": {"length": Config.PROFESSIONAL_CONFIG["door_height"], "unit": "cm"},
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
                "height": {"length": Config.PROFESSIONAL_CONFIG["door_height"], "unit": "cm"},
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
            "width": {"length": Config.PROFESSIONAL_CONFIG["window_width"], "unit": "cm"},
            "height": {"length": Config.PROFESSIONAL_CONFIG["window_height"], "unit": "cm"},
            "altitude": {"length": Config.PROFESSIONAL_CONFIG["window_altitude"], "unit": "cm"},
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
        texture = Config.PROFESSIONAL_CONFIG["room_types"][room_type]["texture"]

    # Map to special textures if available
    if texture in Config.PROFESSIONAL_CONFIG["special_textures"]:
        texture = Config.PROFESSIONAL_CONFIG["special_textures"][texture]

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
    room_config = Config.PROFESSIONAL_CONFIG["room_types"][room_type]
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
        area_vertices = []

        # Top-left corner
        tl_x = x1 + random.uniform(0, room_cell_width * 0.2)
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
            'doors_needed': Config.PROFESSIONAL_CONFIG["room_types"][room['type']]["min_doors"]
        }

        # Map cell to room
        cell_to_room[(row, col)] = room['name']

        # Add room label
        label_x = (x1 + x2) / 2
        label_y = (y1 + y2) / 2
        label_id = generate_unique_id("label")
        items[label_id] = create_room_label(label_id, room['name'], label_x, label_y, room['type'], cell_width)

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
        main_door_offset = 0.1  # Position towards the left side
        holes[entrance_id] = create_door(entrance_id, bottom_wall, main_door_offset, is_main_entrance=True)
        walls[bottom_wall]["holes"].append(entrance_id)
        wall_usage[bottom_wall] = True

    # Add doors to rooms
    shared_walls = {wall_id: rooms for wall_id, rooms in wall_to_rooms.items() if len(rooms) >= 2}
    doors_per_room = defaultdict(int)

    # Phase 1: Assign doors to rooms based on their needs
    for room_name, room_info in room_areas.items():
        doors_needed = room_info['doors_needed']
        doors_added = 0

        for wall_id in room_info['adjacent_walls']:
            if wall_id in shared_walls and not wall_usage.get(wall_id, False):
                if doors_added < doors_needed:
                    possible_offsets = [0.3, 0.4, 0.5, 0.6, 0.7]
                    for offset in possible_offsets:
                        if is_door_position_available(wall_id, offset, holes, walls, 0.15):
                            door_id = generate_unique_id("door")
                            holes[door_id] = create_door(door_id, wall_id, offset, is_main_entrance=False)
                            walls[wall_id]["holes"].append(door_id)
                            wall_usage[wall_id] = True
                            doors_per_room[room_name] += 1
                            other_rooms = [r for r in shared_walls[wall_id] if r != room_name]
                            if other_rooms:
                                doors_per_room[other_rooms[0]] += 1
                            doors_added += 1
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

    return design

def create_furniture_item(item_type, x, y, rotation=0):
    """Create a furniture item from the catalog"""
    catalog_item = Config.PROFESSIONAL_CONFIG["furniture_catalog"].get(item_type)
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

    for room_info in rooms_info:
        room_name = room_info['name']
        room_type = room_info['type']

        room_config = Config.PROFESSIONAL_CONFIG["room_types"].get(room_type, {})

        # Find the area for this room
        areas = layer.get("areas", {})
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

        # Calculate approximate room center
        vertex_coords = []
        for vertex_id in vertices:
            vertex = layer.get("vertices", {}).get(vertex_id)
            if vertex:
                vertex_coords.append((vertex["x"], vertex["y"]))

        if not vertex_coords:
            continue

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
            furniture_list = room_config.get("furniture", [])

        if furniture_list:
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
            accessories_list = room_config.get("accessories", [])

        if accessories_list:
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

    # Import here to avoid circular imports
    from .design_utils import process_room_requirements

    rooms = process_room_requirements(requirements)

    # Build professional layout
    design = build_grid_layout(rooms, width_cm, height_cm)

    # Add furniture and accessories to the design
    design = add_furniture_and_accessories(design, rooms)

    return design
