#!/usr/bin/env python3
"""
Generate test image with known ground truth coordinates.
Outputs both the image and a ground truth JSON file with experiment_id.
Supports randomization and hard mode (overlapping shapes).
"""

from PIL import Image, ImageDraw, ImageFilter
import json
import uuid
import random
import math
from pathlib import Path
from datetime import datetime
import numpy as np

# Image dimensions
WIDTH = 1036
HEIGHT = 558

# Generate unique experiment_id for this test run
EXPERIMENT_ID = str(uuid.uuid4())
TIMESTAMP = datetime.utcnow().isoformat() + "Z"

# Ground truth objects with known coordinates
# abs_box_2d: absolute pixel coordinates [ymin, xmin, ymax, xmax]
# box_2d: normalized coordinates (0-1000 scale) [ymin, xmin, ymax, xmax]
GROUND_TRUTH = [
    {
        "label": "red rectangle",
        "color": "red",
        "abs_box_2d": [50, 50, 150, 200],
        "box_2d": [int(50/HEIGHT*1000), int(50/WIDTH*1000), int(150/HEIGHT*1000), int(200/WIDTH*1000)]
    },
    {
        "label": "blue rectangle",
        "color": "blue",
        "abs_box_2d": [50, 250, 150, 400],
        "box_2d": [int(50/HEIGHT*1000), int(250/WIDTH*1000), int(150/HEIGHT*1000), int(400/WIDTH*1000)]
    },
    {
        "label": "green rectangle",
        "color": "green",
        "abs_box_2d": [50, 450, 150, 600],
        "box_2d": [int(50/HEIGHT*1000), int(450/WIDTH*1000), int(150/HEIGHT*1000), int(600/WIDTH*1000)]
    },
    {
        "label": "yellow rectangle",
        "color": "yellow",
        "abs_box_2d": [350, 100, 450, 250],
        "box_2d": [int(350/HEIGHT*1000), int(100/WIDTH*1000), int(450/HEIGHT*1000), int(250/WIDTH*1000)]
    },
    {
        "label": "purple rectangle",
        "color": "purple",
        "abs_box_2d": [350, 400, 450, 550],
        "box_2d": [int(350/HEIGHT*1000), int(400/WIDTH*1000), int(450/HEIGHT*1000), int(550/WIDTH*1000)]
    }
]

def generate_ground_truth(randomize: bool = False, hard: bool = False, num_objects: int = 5):
    """Generate ground truth objects with optional randomization and hard mode."""
    if hard:
        # Hard mode: extreme adversarial objects with maximum overlap and degradation
        objects = []
        num = random.randint(12, min(num_objects, 18))
        colors = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"]

        # Create multiple tight overlapping clusters
        num_clusters = random.randint(3, 5)
        for cluster_idx in range(num_clusters):
            cluster_x = random.randint(150, WIDTH - 150)
            cluster_y = random.randint(100, HEIGHT - 100)
            cluster_size = random.randint(4, 7)

            for i in range(cluster_size):
                if len(objects) >= num:
                    break

                color = colors[i % len(colors)]
                size = random.randint(20, 45)

                # Extremely tight clustering for maximum overlap
                cx = cluster_x + random.randint(-100, 100)
                cy = cluster_y + random.randint(-80, 80)

                cx = max(size, min(WIDTH - size, cx))
                cy = max(size, min(HEIGHT - size, cy))

                ymin = max(0, cy - size // 2)
                xmin = max(0, cx - size // 2)
                ymax = min(HEIGHT, cy + size // 2)
                xmax = min(WIDTH, cx + size // 2)

                objects.append({
                    "label": f"{color} rectangle",
                    "color": color,
                    "abs_box_2d": [ymin, xmin, ymax, xmax],
                    "box_2d": [
                        int(ymin / HEIGHT * 1000),
                        int(xmin / WIDTH * 1000),
                        int(ymax / HEIGHT * 1000),
                        int(xmax / WIDTH * 1000)
                    ]
                })

        return objects
    elif randomize:
        # Randomized mode: generate variable number of objects with random positions
        objects = []
        num = random.randint(3, num_objects)
        colors = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"]

        for i in range(num):
            color = colors[i % len(colors)]
            # Random size between 80-150 pixels
            height = random.randint(80, 150)
            width = random.randint(80, 150)
            # Random position ensuring it fits in image
            ymin = random.randint(10, HEIGHT - height - 10)
            xmin = random.randint(10, WIDTH - width - 10)
            ymax = ymin + height
            xmax = xmin + width

            objects.append({
                "label": f"{color} rectangle",
                "color": color,
                "abs_box_2d": [ymin, xmin, ymax, xmax],
                "box_2d": [
                    int(ymin / HEIGHT * 1000),
                    int(xmin / WIDTH * 1000),
                    int(ymax / HEIGHT * 1000),
                    int(xmax / WIDTH * 1000)
                ]
            })
        return objects
    else:
        # Standard mode: ultra-dense packing with adversarial effects
        objects = []
        positions = [
            [120, 120, 170, 170],
            [120, 200, 170, 250],
            [120, 280, 170, 330],
            [120, 360, 170, 410],
            [250, 120, 300, 170],
            [250, 200, 300, 250],
            [250, 280, 300, 330],
            [250, 360, 300, 410],
        ]
        colors = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"]

        for i, pos in enumerate(positions):
            ymin, xmin, ymax, xmax = pos
            color = colors[i % len(colors)]
            objects.append({
                "label": f"{color} rectangle",
                "color": color,
                "abs_box_2d": [ymin, xmin, ymax, xmax],
                "box_2d": [
                    int(ymin / HEIGHT * 1000),
                    int(xmin / WIDTH * 1000),
                    int(ymax / HEIGHT * 1000),
                    int(xmax / WIDTH * 1000)
                ],
                "blur_radius": 1,
                "apply_noise": True,
                "reduce_contrast": True
            })
        return objects

def apply_blur(image: Image.Image, radius: int = 2) -> Image.Image:
    """Apply Gaussian blur to image."""
    return image.filter(ImageFilter.GaussianBlur(radius=radius))

def apply_noise(image: Image.Image, intensity: float = 0.05) -> Image.Image:
    """Add random noise to image."""
    img_array = np.array(image, dtype=np.float32)
    noise = np.random.normal(0, intensity * 255, img_array.shape)
    noisy = np.clip(img_array + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(noisy)

def reduce_contrast(image: Image.Image, factor: float = 0.6) -> Image.Image:
    """Reduce image contrast by blending with gray."""
    img_array = np.array(image, dtype=np.float32)
    gray = np.mean(img_array, axis=2, keepdims=True)
    reduced = (img_array * factor + gray * (1 - factor)).astype(np.uint8)
    return Image.fromarray(reduced)

def draw_objects(draw, objects, width, height):
    """Draw objects on image based on their shape."""
    for obj in objects:
        color = obj["color"]

        if obj.get("shape") == "circle":
            cy, cx = obj["center"]
            size = obj["size"]
            draw.ellipse([cx - size, cy - size, cx + size, cy + size], fill=color)
        elif obj.get("shape") == "polygon":
            cy, cx = obj["center"]
            size = obj["size"]
            # Draw triangle
            points = [
                (cx, cy - size),
                (cx + size, cy + size),
                (cx - size, cy + size)
            ]
            draw.polygon(points, fill=color)
        else:
            # Rectangle
            ymin, xmin, ymax, xmax = obj["abs_box_2d"]
            draw.rectangle([xmin, ymin, xmax, ymax], fill=color)

if __name__ == "__main__":
    import sys

    # Require experiment_id as first argument
    if len(sys.argv) < 2:
        print("Error: experiment_id is required")
        print("Usage: python generate_input.py <experiment_id> [--randomize] [--hard] [--num-objects N]")
        print("Example: python generate_input.py v1")
        print("Example: python generate_input.py v2 --randomize --num-objects 8")
        print("Example: python generate_input.py v2_hard --hard --num-objects 10")
        sys.exit(1)

    experiment_id = sys.argv[1]

    # Check for flags
    randomize = "--randomize" in sys.argv
    hard = "--hard" in sys.argv
    num_objects = 5

    if "--num-objects" in sys.argv:
        idx = sys.argv.index("--num-objects")
        if idx + 1 < len(sys.argv):
            num_objects = int(sys.argv[idx + 1])

    input_dir = Path(__file__).parent.parent / "input"
    input_dir.mkdir(parents=True, exist_ok=True)

    # Generate image
    ground_truth_objects = generate_ground_truth(randomize=randomize, hard=hard, num_objects=num_objects)
    img = Image.new('RGB', (WIDTH, HEIGHT), color='white')
    draw = ImageDraw.Draw(img)

    draw_objects(draw, ground_truth_objects, WIDTH, HEIGHT)

    # Apply adversarial effects for hard/standard modes
    if hard or not randomize:
        # Apply blur
        img = apply_blur(img, radius=2)
        # Apply noise
        img = apply_noise(img, intensity=0.08)
        # Reduce contrast
        img = reduce_contrast(img, factor=0.65)

    img_path = input_dir / f"test_image_{experiment_id}.png"
    img.save(img_path)
    print(f"Generated test image: {img_path}")

    # Generate ground truth with experiment_id
    gt = {
        "experiment_id": experiment_id,
        "timestamp": TIMESTAMP,
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
    print(f"Experiment ID: {experiment_id}")
    print(f"Objects: {len(ground_truth_objects)}")
    if hard:
        print(f"Mode: Hard (overlapping shapes + blur + noise + low contrast)")
    elif randomize:
        print(f"Mode: Randomized")
    else:
        print(f"Mode: Standard (dense packing + blur + noise + low contrast)")

