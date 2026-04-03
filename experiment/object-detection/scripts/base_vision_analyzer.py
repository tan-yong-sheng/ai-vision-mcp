#!/usr/bin/env python3
"""
Shared base code for vision analysis (object detection and segmentation)
Uses dynamic prompts: base prompt for detection, appended prompt for segmentation
"""

from google import genai
from google.genai import types
from PIL import Image as PILImage, ImageDraw
import json
import os
import sys
import time
import base64
import io
from pathlib import Path
from dotenv import load_dotenv, find_dotenv
from datetime import datetime
import uuid

# Load environment variables
load_dotenv(find_dotenv())

api_key = os.getenv("GEMINI_API_KEY")
base_url = os.getenv("GEMINI_BASE_URL")

if not api_key:
    print("Error: GEMINI_API_KEY not set")
    sys.exit(1)

# Initialize client
client = genai.Client(
    api_key=api_key,
    http_options=types.HttpOptions(base_url=base_url) if base_url else None
)

# Base prompt for object detection
BASE_PROMPT = """Detect ALL objects in this image with extreme precision. Return a JSON list of detections where each entry contains:
- "label": descriptive object label
- "confidence": confidence score (0-1)
- "box_2d": [ymin, xmin, ymax, xmax] with normalized coordinates (0-1000)
CRITICAL: Detect EVERY object visible, including small, overlapping, and partially occluded objects.
Pay special attention to:
- Small objects that might be missed
- Overlapping objects - provide separate boxes for each
- Objects at image edges
- Objects with similar colors to background
- Blurry or low-contrast objects
Return ONLY valid JSON, no additional text."""

# Segmentation-specific prompt to append
SEGMENTATION_APPEND = """Additionally, for each detection, include:
- "mask": base64-encoded PNG segmentation mask for the object
Mask requirements:
- Generate precise pixel-level masks with sharp boundaries
- Use 255 for pixels definitively inside the object, 0 for background
- For overlapping objects: provide clean separation between masks
- Minimize spillover into adjacent objects
- Ensure mask covers the entire object without gaps
- Use high confidence threshold (200+) for boundary pixels"""


def create_prompt(mode: str) -> str:
    """Create dynamic prompt based on mode."""
    if mode == "segmentation":
        return BASE_PROMPT + "\n" + SEGMENTATION_APPEND
    return BASE_PROMPT


def load_image(image_path: Path) -> tuple:
    """Load image and return PIL image and metadata."""
    if not image_path.exists():
        print(f"Error: Image not found at {image_path}")
        sys.exit(1)

    image = PILImage.open(image_path)
    with open(image_path, "rb") as f:
        image_data = f.read()

    return image, image_data


def call_gemini_api(image: PILImage.Image, prompt: str) -> dict:
    """Call Gemini API and return parsed JSON result."""
    system_instruction = """You are an expert object detection and segmentation system.
Return accurate bounding boxes and segmentation masks as JSON.
For bounding boxes: use [ymin, xmin, ymax, xmax] format normalized to 0-1000.
For segmentation: include base64-encoded PNG masks for each object.
CRITICAL: Be extremely precise with object boundaries:
- Use 255 for pixels definitively inside the object
- Use 0 for pixels definitively outside the object
- Minimize uncertainty at boundaries
- Do NOT include spillover into adjacent objects
- Each mask should be a clean, sharp binary mask
Limit to 25 objects maximum.
If objects overlap, provide separate masks for each object with clear separation."""

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        response_mime_type="application/json",
        temperature=0,
        top_k=1,
        top_p=0.95,
        seed=42,
        candidate_count=1,
        max_output_tokens=4000,
        thinking_config=types.ThinkingConfig(thinking_budget=0)
    )

    start_time = time.time()
    response = client.models.generate_content(
        model="gemini-robotics-er-1.5-preview",
        contents=[image, prompt],
        config=config
    )
    processing_time_ms = (time.time() - start_time) * 1000

    result = json.loads(response.text)
    # Handle case where API returns list directly instead of dict with "detections" key
    if isinstance(result, list):
        result = {"detections": result}
    return result, processing_time_ms


def create_json_output(
    detections: list,
    image_width: int,
    image_height: int,
    image_size_bytes: int,
    image_format: str,
    processing_time_ms: float,
    mode: str,
    experiment_id: str = None
) -> dict:
    """Create standardized JSON output."""
    return {
        "model": "gemini-robotics-er-1.5",
        "mode": mode,
        "detections": detections,
        "image_metadata": {
            "width": image_width,
            "height": image_height,
            "size_bytes": image_size_bytes,
            "format": image_format
        },
        "processing_time_ms": processing_time_ms,
        "metadata": {
            "model": "gemini-robotics-er-1.5",
            "provider": "google",
            "mode": mode,
            "processingTime": processing_time_ms,
            "fileType": f"image/{image_format.lower()}",
            "fileSize": image_size_bytes,
            "modelVersion": "gemini-robotics-er-1.5",
            "responseId": str(uuid.uuid4()),
            "experiment_id": experiment_id,
            "coordinateScale": 1000,
            "coordinateFormat": "[ymin, xmin, ymax, xmax]",
            "coordinateOrigin": "top-left",
            "detectionMethod": "vision",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    }


def draw_annotations(
    image: PILImage.Image,
    detections: list,
    mode: str
) -> PILImage.Image:
    """Draw bounding boxes and masks on image."""
    annotated = image.convert("RGBA")
    draw = ImageDraw.Draw(annotated, "RGBA")
    image_width, image_height = image.size

    for detection in detections:
        # box_2d is normalized coordinates (0-1000), abs_box_2d is absolute pixel coordinates
        if "box_2d" in detection:
            bbox = detection["box_2d"]
            ymin, xmin, ymax, xmax = bbox
            pixel_x1 = int((xmin / 1000) * image_width)
            pixel_y1 = int((ymin / 1000) * image_height)
            pixel_x2 = int((xmax / 1000) * image_width)
            pixel_y2 = int((ymax / 1000) * image_height)
        elif "abs_box_2d" in detection:
            bbox = detection["abs_box_2d"]
            ymin, xmin, ymax, xmax = bbox
            pixel_x1 = int(xmin)
            pixel_y1 = int(ymin)
            pixel_x2 = int(xmax)
            pixel_y2 = int(ymax)
        else:
            continue

        # Draw bounding box
        draw.rectangle([pixel_x1, pixel_y1, pixel_x2, pixel_y2], outline="cyan", width=2)

        # Draw label with confidence
        label = detection.get("label", "object")
        confidence = detection.get("confidence", 0)
        text = f"{label} ({confidence:.2f})"
        draw.text((pixel_x1, pixel_y1 - 10), text, fill="cyan")

        # Draw mask if segmentation mode
        if mode == "segmentation":
            mask_b64 = detection.get("mask", "")
            if mask_b64:
                try:
                    # Normalize: add prefix if missing
                    if not mask_b64.startswith("data:image/png;base64,"):
                        mask_b64 = "data:image/png;base64," + mask_b64
                    # Remove prefix for decoding
                    mask_b64 = mask_b64.replace("data:image/png;base64,", "")
                    mask_data = base64.b64decode(mask_b64)
                    mask_bytes = io.BytesIO(mask_data)
                    mask_bytes.seek(0)
                    mask = PILImage.open(mask_bytes)
                    # Convert to grayscale to ensure single-channel data
                    mask = mask.convert('L')

                    # Resize mask to match bounding box
                    mask_width = pixel_x2 - pixel_x1
                    mask_height = pixel_y2 - pixel_y1
                    if mask_width > 0 and mask_height > 0:
                        mask = mask.resize((mask_width, mask_height), PILImage.Resampling.BILINEAR)

                        # Apply adaptive boundary clipping to reduce spillover
                        # Use morphological operations for better edge handling
                        mask_array = list(mask.getdata())
                        clipped_mask = PILImage.new('L', (mask_width, mask_height), 0)
                        clipped_data = clipped_mask.load()

                        # First pass: dilate to fill small gaps
                        for y in range(mask_height):
                            for x in range(mask_width):
                                if mask_array[y * mask_width + x] > 127:
                                    clipped_data[x, y] = 255
                                    # Dilate slightly to fill gaps
                                    if x > 0 and mask_array[y * mask_width + (x-1)] > 100:
                                        clipped_data[x-1, y] = 255
                                    if x < mask_width - 1 and mask_array[y * mask_width + (x+1)] > 100:
                                        clipped_data[x+1, y] = 255

                        # Second pass: erode edges to prevent spillover
                        eroded_mask = PILImage.new('L', (mask_width, mask_height), 0)
                        eroded_data = eroded_mask.load()

                        for y in range(1, mask_height - 1):
                            for x in range(1, mask_width - 1):
                                if clipped_data[x, y] > 200:
                                    # Check 8-connectivity neighbors
                                    neighbors = [
                                        clipped_data[x-1, y-1], clipped_data[x, y-1], clipped_data[x+1, y-1],
                                        clipped_data[x-1, y], clipped_data[x+1, y],
                                        clipped_data[x-1, y+1], clipped_data[x, y+1], clipped_data[x+1, y+1]
                                    ]
                                    if sum(1 for n in neighbors if n > 200) >= 5:
                                        eroded_data[x, y] = 255

                        mask = eroded_mask

                        # Create semi-transparent overlay image
                        overlay = PILImage.new("RGBA", (mask_width, mask_height), (0, 0, 0, 0))
                        overlay_draw = ImageDraw.Draw(overlay)

                        mask_array = list(mask.getdata())
                        pixels_drawn = 0

                        # Draw semi-transparent overlay for mask
                        # Use threshold of 127 (midpoint) for better boundary precision
                        threshold = 127
                        for y in range(mask_height):
                            for x in range(mask_width):
                                pixel_val = mask_array[y * mask_width + x]
                                if pixel_val > threshold:
                                    # Adjust alpha based on confidence (pixel value)
                                    # Higher values = more opaque
                                    alpha = int(150 + (pixel_val - threshold) / (255 - threshold) * 70)
                                    overlay_draw.point((x, y), fill=(0, 0, 255, alpha))
                                    pixels_drawn += 1

                        # Paste overlay onto annotated image
                        if pixels_drawn > 0:
                            annotated.paste(overlay, (pixel_x1, pixel_y1), overlay)
                except Exception as e:
                    print(f"Warning: Could not process mask for {label}: {e}")

    return annotated


def run_analysis(mode: str, output_filename: str, experiment_id: str = None):
    """Run vision analysis (detection or segmentation)."""
    # Require experiment_id
    if not experiment_id:
        print("Error: experiment_id is required")
        print("Usage: python base_vision_analyzer.py <mode> <output_filename> <experiment_id>")
        print("Example: python base_vision_analyzer.py segmentation test_segmentation v1")
        sys.exit(1)

    # Setup
    image_path = Path(__file__).parent.parent / "input" / f"test_image_{experiment_id}.png"
    output_dir = Path(__file__).parent.parent / "output"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Running {mode} with gemini-robotics-er-1.5...")
    print(f"Image path: {image_path}")
    print(f"Experiment ID: {experiment_id}")
    print()

    try:
        # Load ground truth to verify experiment_id
        gt_path = Path(__file__).parent.parent / "input" / f"ground_truth_{experiment_id}.json"
        if not gt_path.exists():
            print(f"Error: Ground truth file not found: {gt_path}")
            sys.exit(1)

        with open(gt_path, "r") as f:
            gt_data = json.load(f)
            loaded_experiment_id = gt_data.get("experiment_id")
            if loaded_experiment_id != experiment_id:
                print(f"Error: experiment_id mismatch. Expected {experiment_id}, got {loaded_experiment_id}")
                sys.exit(1)

        # Load image
        print("Loading image...")
        image, image_data = load_image(image_path)
        image_width, image_height = image.size
        image_size_bytes = len(image_data)
        image_format = image.format or "JPEG"
        print(f"Image: {image_width}x{image_height} ({image_format}, {image_size_bytes / 1024:.1f}KB)")
        print()

        # Create dynamic prompt
        prompt = create_prompt(mode)

        # Call API
        print("Calling Gemini API...")
        result, processing_time_ms = call_gemini_api(image, prompt)
        detections = result.get("detections", [])
        print(f"Response received in {processing_time_ms:.0f}ms")
        print()

        # Create JSON output with experiment_id
        json_output = create_json_output(
            detections,
            image_width,
            image_height,
            image_size_bytes,
            image_format,
            processing_time_ms,
            mode,
            experiment_id=experiment_id
        )

        # Save JSON with experiment_id in filename
        json_file = output_dir / f"{output_filename}_{experiment_id}.json"
        image_file = output_dir / f"{output_filename}_{experiment_id}.png"

        with open(json_file, "w") as f:
            json.dump(json_output, f, indent=2)
        print(f"JSON saved: {json_file}")

        # Create and save annotated image
        annotated = draw_annotations(image, detections, mode)
        annotated.save(image_file)
        print(f"Image saved: {image_file}")
        print(f"Detections: {len(detections)}")
        print(f"Experiment ID: {experiment_id}")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
