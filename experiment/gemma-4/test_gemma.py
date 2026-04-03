#!/usr/bin/env python3
"""Test Gemma 4 image handling via genai SDK"""

from google import genai
from google.genai import types
import os
from dotenv import load_dotenv, find_dotenv
from pathlib import Path

# Load environment variables
load_dotenv(find_dotenv())

api_key = os.getenv("GEMINI_API_KEY")
base_url = os.getenv("GEMINI_BASE_URL")

if not api_key:
    print("Error: GEMINI_API_KEY not set")
    exit(1)

print(f"API Key: {api_key[:20]}...")
print(f"Base URL: {base_url or 'default'}\n")

# Initialize client
if base_url:
    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(base_url=base_url)
    )
else:
    client = genai.Client(api_key=api_key)

# Test 1: gemma text generation without thinking
print("Test 1: Gemma text generation (no thinking)...")
try:
    response = client.models.generate_content(
        model="gemma-4-31b-it",
        contents="Say 'Hello from Gemma!' in one sentence."
    )
    print(f"✓ Success!")
    print(f"Response: {response.text}\n")
except Exception as e:
    print(f"✗ Failed: {e}\n")

# Test 2: gemma text generation with thinking config (expected to fail)
print("Test 2: Gemma text generation with thinking config...")
try:
    response = client.models.generate_content(
        model="gemma-4-31b-it",
        contents="Say 'Hello from Gemma!' in one sentence.",
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(
                thinking_budget=1000
            )
        )
    )
    print(f"✓ Success!")
    print(f"Response: {response.text}\n")
except Exception as e:
    print(f"✗ Failed (expected): {e}\n")

# Test 3: Gemma image understanding (direct image data)
print("Test 3: Gemma image understanding (direct image data)...")
try:
    from PIL import Image

    # Find a test image
    input_dir = Path(__file__).parent.parent / "object-detection-v2" / "input"
    image_files = list(input_dir.glob("*.jpg")) + list(input_dir.glob("*.png"))

    if image_files:
        image_path = image_files[0]
        print(f"Using image: {image_path.name}")

        # Load image as PIL Image
        image = Image.open(image_path)
        print(f"Image size: {image.size}")

        # Generate caption with direct image data
        response = client.models.generate_content(
            model="gemma-4-31b-it",
            contents=[image, "Describe this image briefly."]
        )
        print(f"✓ Success!")
        print(f"Response: {response.text}\n")
    else:
        print("✗ No test images found\n")
except Exception as e:
    print(f"✗ Failed: {e}\n")
