#!/usr/bin/env python3
"""
Generate ultra-hard synthetic test images with realistic overlaps and occlusions.
Simpler than PyBullet - uses direct 2D rendering with physics-inspired placement.
"""

from PIL import Image, ImageDraw, ImageFilter
import json
import sys
from pathlib import Path
from datetime import datetime
import numpy as np
import random

WIDTH = 1036
HEIGHT = 558

def generate_ultra_hard_objects(num_objects: int = 10):
    """Generate objects with realistic overlaps and occlusions."""
    objects = []
    colors = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"]
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

    # Create clusters of overlapping objects
    num_clusters = random.randint(2, 4)
    objects_per_cluster = num_objects // num_clusters

    for cluster_idx in range(num_clusters):
        # Random cluster center
        cluster_x = random.randint(150, WIDTH - 150)
        cluster_y = random.randint(100, HEIGHT - 100)

        for i in range(objects_per_cluster):
            if len(objects) >= num_objects:
                break

            # Random size (40-120 pixels)
            size = random.randint(40, 120)

            # Position near cluster center with some spread
            x = cluster_x + random.randint(-100, 100)
            y = cluster_y + random.randint(-80, 80)

            # Clamp to image bounds
            x = max(size, min(WIDTH - size, x))
            y = max(size, min(HEIGHT - size, y))

            ymin = max(0, y - size // 2)
            xmin = max(0, x - size // 2)
            ymax = min(HEIGHT, y + size // 2)
            xmax = min(WIDTH, x + size // 2)

            color_idx = (cluster_idx * objects_per_cluster + i) % len(colors)
            objects.append({
                "label": f"{colors[color_idx]} box",
                "color": colors[color_idx],
                "color_rgb": colors_rgb[color_idx],
                "abs_box_2d": [ymin, xmin, ymax, xmax],
                "box_2d": [
                    int(ymin / HEIGHT * 1000),
                    int(xmin / WIDTH * 1000),
                    int(ymax / HEIGHT * 1000),
                    int(xmax / WIDTH * 1000)
                ],
                "z_order": random.random()  # For depth sorting
            })

    return objects

def render_ultra_hard(objects):
    """Render objects with overlaps and occlusions."""
    img = Image.new('RGB', (WIDTH, HEIGHT), color='white')
    draw = ImageDraw.Draw(img)

    # Sort by z-order for proper occlusion
    sorted_objects = sorted(objects, key=lambda o: o["z_order"])

    for obj in sorted_objects:
        ymin, xmin, ymax, xmax = obj["abs_box_2d"]
        draw.rectangle([xmin, ymin, xmax, ymax], fill=obj["color_rgb"])

    # Apply adversarial effects
    # Heavy blur
    img = img.filter(ImageFilter.GaussianBlur(radius=3))

    # Add noise
    img_array = np.array(img, dtype=np.float32)
    noise = np.random.normal(0, 0.12 * 255, img_array.shape)
    noisy = np.clip(img_array + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(noisy)

    # Reduce contrast heavily
    img_array = np.array(img, dtype=np.float32)
    gray = np.mean(img_array, axis=2, keepdims=True)
    reduced = (img_array * 0.5 + gray * 0.5).astype(np.uint8)
    img = Image.fromarray(reduced)

    return img

def generate_ultra_hard(num_objects: int = 10, experiment_id: str = "ultra_v1"):
    """Generate ultra-hard synthetic data."""
    objects = generate_ultra_hard_objects(num_objects)
    img = render_ultra_hard(objects)

    # Filter out objects that are too small
    ground_truth = []
    for obj in objects:
        ymin, xmin, ymax, xmax = obj["abs_box_2d"]
        if (xmax - xmin) >= 5 and (ymax - ymin) >= 5:
            ground_truth.append({
                "label": obj["label"],
                "color": obj["color"],
                "abs_box_2d": [ymin, xmin, ymax, xmax],
                "box_2d": obj["box_2d"]
            })

    return img, ground_truth

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: experiment_id is required")
        print("Usage: python generate_input_ultrahard.py <experiment_id> [--num-objects N]")
        print("Example: python generate_input_ultrahard.py ultra_v1")
        print("Example: python generate_input_ultrahard.py ultra_v2 --num-objects 12")
        sys.exit(1)

    experiment_id = sys.argv[1]
    num_objects = 10

    if "--num-objects" in sys.argv:
        idx = sys.argv.index("--num-objects")
        if idx + 1 < len(sys.argv):
            num_objects = int(sys.argv[idx + 1])

    input_dir = Path(__file__).parent.parent / "input"
    input_dir.mkdir(parents=True, exist_ok=True)

    print(f"Generating ultra-hard synthetic data for {experiment_id}...")
    print(f"Objects: {num_objects}")

    img, ground_truth = generate_ultra_hard(num_objects, experiment_id)

    # Save image
    img_path = input_dir / f"test_image_{experiment_id}.png"
    img.save(img_path)
    print(f"Generated test image: {img_path}")

    # Save ground truth
    gt = {
        "experiment_id": experiment_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "mode": "ultra_hard",
        "image_metadata": {
            "width": WIDTH,
            "height": HEIGHT,
            "format": "PNG"
        },
        "ground_truth_objects": ground_truth
    }

    gt_path = input_dir / f"ground_truth_{experiment_id}.json"
    with open(gt_path, "w") as f:
        json.dump(gt, f, indent=2)
    print(f"Generated ground truth: {gt_path}")
    print(f"Detections: {len(ground_truth)}")
