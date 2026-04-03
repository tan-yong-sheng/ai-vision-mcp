#!/usr/bin/env python3
"""
Generate ultra-hard synthetic test images using PyBullet physics simulation.
Creates realistic object overlaps, occlusions, and natural arrangements.
Outputs image and ground truth JSON with precise coordinates.
"""

import pybullet as p
import pybullet_data
import numpy as np
from PIL import Image, ImageDraw
import json
import sys
from pathlib import Path
from datetime import datetime

# Image dimensions
WIDTH = 1036
HEIGHT = 558

def setup_physics():
    """Initialize PyBullet physics engine (headless mode)."""
    client = p.connect(p.DIRECT)
    p.setAdditionalSearchPath(pybullet_data.getDataPath())
    p.setGravity(0, 0, -9.81)
    p.setPhysicsEngineParameter(numSubSteps=5, fixedTimeStep=1./240.)

    # Create ground plane
    ground_id = p.loadURDF("plane.urdf", [0, 0, -1])
    return client, ground_id

def create_objects(num_objects: int = 8):
    """Create objects in a grid pattern for reliable rendering."""
    objects = []
    colors_rgb = [
        (255, 0, 0),      # red
        (0, 0, 255),      # blue
        (0, 255, 0),      # green
        (255, 255, 0),    # yellow
        (255, 0, 255),    # purple
        (255, 128, 0),    # orange
        (255, 192, 203),  # pink
        (0, 255, 255),    # cyan
    ]

    color_names = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"]

    # Create objects in a grid pattern
    cols = int(np.ceil(np.sqrt(num_objects)))
    size = 0.15  # Fixed size for consistency

    for i in range(num_objects):
        row = i // cols
        col = i % cols

        # Grid positions in world space
        x = -0.4 + col * 0.3
        y = -0.2 + row * 0.25
        z = 0.5  # Start at fixed height

        # Create box shape
        shape_id = p.createCollisionShape(p.GEOM_BOX, halfExtents=[size, size, size])

        # Create multibody
        obj_id = p.createMultiBody(
            baseMass=0.5,
            baseCollisionShapeIndex=shape_id,
            basePosition=[x, y, z],
            baseOrientation=[0, 0, 0, 1]
        )

        color_idx = i % len(colors_rgb)
        objects.append({
            "id": obj_id,
            "size": size,
            "color": color_names[color_idx],
            "color_rgb": colors_rgb[color_idx]
        })

    return objects

def simulate_physics(num_steps: int = 500):
    """Run physics simulation to let objects settle."""
    for _ in range(num_steps):
        p.stepSimulation()

def project_to_screen(pos, orn, half_extents, view_matrix, proj_matrix):
    """Project 3D object to 2D screen coordinates using proper matrix math."""
    corners_local = np.array([
        [-half_extents[0], -half_extents[1], -half_extents[2]],
        [half_extents[0], -half_extents[1], -half_extents[2]],
        [-half_extents[0], half_extents[1], -half_extents[2]],
        [half_extents[0], half_extents[1], -half_extents[2]],
        [-half_extents[0], -half_extents[1], half_extents[2]],
        [half_extents[0], -half_extents[1], half_extents[2]],
        [-half_extents[0], half_extents[1], half_extents[2]],
        [half_extents[0], half_extents[1], half_extents[2]],
    ])

    # Transform to world space
    rot_matrix = np.array(p.getMatrixFromQuaternion(orn)).reshape(3, 3)
    corners_world = np.dot(corners_local, rot_matrix.T) + np.array(pos)

    # Reshape matrices to 4x4
    vmat = np.array(view_matrix).reshape((4, 4), order='C')
    pmat = np.array(proj_matrix).reshape((4, 4), order='C')

    # Combined transformation matrix
    fmat = pmat @ vmat.T

    # Project corners to screen space
    screen_coords = []
    for corner in corners_world:
        # Convert to homogeneous coordinates
        point_h = np.array([corner[0], corner[1], corner[2], 1.0])

        # Apply transformation
        projected = fmat @ point_h

        # Normalize by w
        if projected[3] != 0:
            ndc = projected[:3] / projected[3]

            # Map NDC to screen coordinates
            screen_x = (ndc[0] + 1.0) / 2.0 * WIDTH
            screen_y = (1.0 - ndc[1]) / 2.0 * HEIGHT
            screen_coords.append([screen_x, screen_y])

    if not screen_coords:
        return [0, 0, 0, 0]

    screen_coords = np.array(screen_coords)

    # Get bounding box from all corners
    xmin = max(0, int(np.min(screen_coords[:, 0])))
    xmax = min(WIDTH - 1, int(np.max(screen_coords[:, 0])) + 1)
    ymin = max(0, int(np.min(screen_coords[:, 1])))
    ymax = min(HEIGHT - 1, int(np.max(screen_coords[:, 1])) + 1)

    return [ymin, xmin, ymax, xmax]

def render_scene_simple(objects, view_matrix, proj_matrix):
    """Render scene using PIL with proper 3D projection."""
    img = Image.new('RGB', (WIDTH, HEIGHT), color='white')
    draw = ImageDraw.Draw(img)

    # Sort objects by z-depth for proper occlusion
    depth_sorted = []
    for obj in objects:
        pos, orn = p.getBasePositionAndOrientation(obj["id"])
        depth_sorted.append((pos[2], obj))

    depth_sorted.sort()

    # Draw each object
    for _, obj in depth_sorted:
        pos, orn = p.getBasePositionAndOrientation(obj["id"])
        collision_shape = p.getCollisionShapeData(obj["id"], -1)[0]
        half_extents = collision_shape[3]

        bbox = project_to_screen(pos, orn, half_extents, view_matrix, proj_matrix)
        ymin, xmin, ymax, xmax = bbox

        if (xmax - xmin) > 5 and (ymax - ymin) > 5:
            draw.rectangle([xmin, ymin, xmax, ymax], fill=obj["color_rgb"])

    return img

def generate_ground_truth_pybullet(num_objects: int = 8, experiment_id: str = "pybullet_v1"):
    """Generate synthetic data using PyBullet."""
    client, ground_id = setup_physics()

    try:
        # Create objects
        objects = create_objects(num_objects)

        # Simulate physics
        simulate_physics(num_steps=500)

        # Setup camera
        camera_distance = 2.0
        camera_yaw = 0
        camera_pitch = -45
        camera_target = [0, 0, 0.3]

        view_matrix = p.computeViewMatrixFromYawPitchRoll(
            cameraTargetPosition=camera_target,
            distance=camera_distance,
            yaw=camera_yaw,
            pitch=camera_pitch,
            roll=0,
            upAxisIndex=2
        )

        proj_matrix = p.computeProjectionMatrixFOV(
            fov=60,
            aspect=WIDTH / HEIGHT,
            nearVal=0.01,
            farVal=100
        )

        # Render scene
        img = render_scene_simple(objects, view_matrix, proj_matrix)

        # Extract ground truth
        ground_truth_objects = []
        for obj in objects:
            pos, orn = p.getBasePositionAndOrientation(obj["id"])
            collision_shape = p.getCollisionShapeData(obj["id"], -1)[0]
            half_extents = collision_shape[3]

            bbox = project_to_screen(pos, orn, half_extents, view_matrix, proj_matrix)
            ymin, xmin, ymax, xmax = bbox

            # Skip if bounding box is too small or invalid
            if (xmax - xmin) < 5 or (ymax - ymin) < 5:
                continue

            ground_truth_objects.append({
                "label": f"{obj['color']} box",
                "color": obj["color"],
                "abs_box_2d": [ymin, xmin, ymax, xmax],
                "box_2d": [
                    int(ymin / HEIGHT * 1000),
                    int(xmin / WIDTH * 1000),
                    int(ymax / HEIGHT * 1000),
                    int(xmax / WIDTH * 1000)
                ]
            })

        return img, ground_truth_objects

    finally:
        p.disconnect(client)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: experiment_id is required")
        print("Usage: python generate_input_pybullet.py <experiment_id> [--num-objects N]")
        print("Example: python generate_input_pybullet.py ultra_v1")
        print("Example: python generate_input_pybullet.py ultra_v2 --num-objects 12")
        sys.exit(1)

    experiment_id = sys.argv[1]
    num_objects = 8

    if "--num-objects" in sys.argv:
        idx = sys.argv.index("--num-objects")
        if idx + 1 < len(sys.argv):
            num_objects = int(sys.argv[idx + 1])

    input_dir = Path(__file__).parent.parent / "input"
    input_dir.mkdir(parents=True, exist_ok=True)

    print(f"Generating PyBullet synthetic data for {experiment_id}...")
    print(f"Objects: {num_objects}")

    # Generate
    img, ground_truth_objects = generate_ground_truth_pybullet(num_objects, experiment_id)

    # Save image
    img_path = input_dir / f"test_image_{experiment_id}.png"
    img.save(img_path)
    print(f"Generated test image: {img_path}")

    # Save ground truth
    gt = {
        "experiment_id": experiment_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "mode": "pybullet",
        "image_metadata": {
            "width": WIDTH,
            "height": HEIGHT,
            "format": "PNG"
        },
        "ground_truth_objects": ground_truth_objects
    }

    gt_path = input_dir / f"ground_truth_{experiment_id}.json"
    with open(gt_path, "w") as f:
        json.dump(gt, f, indent=2)
    print(f"Generated ground truth: {gt_path}")
    print(f"Detections: {len(ground_truth_objects)}")
