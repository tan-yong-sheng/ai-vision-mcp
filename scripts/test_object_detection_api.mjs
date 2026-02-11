/**
 * Test script for object detection API
 * Compares different approaches:
 * 1. Current approach: responseSchema + systemInstruction
 * 2. Simple approach: responseMimeType only (like Google's Python example)
 * 3. No ImageScript: Just test the API without image decoding
 */

import { GoogleGenAI, setDefaultBaseUrls } from '@google/genai';
import dotenv from 'dotenv';
import { Image } from 'imagescript';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test image - a simple red dot PNG (1x1 pixel red image)
const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
const TEST_IMAGE_BUFFER = Buffer.from(TEST_IMAGE_BASE64, 'base64');

// Create a proper test image with some content
async function createTestImage() {
  // Create a 100x100 image with some colored rectangles to detect
  const image = new Image(100, 100);
  // Fill with white background
  image.fill(0xFFFFFFFF);
  // Draw a red rectangle (object 1)
  for (let y = 10; y < 40; y++) {
    for (let x = 10; x < 40; x++) {
      image.setPixelAt(x, y, 0xFF0000FF); // Red
    }
  }
  // Draw a blue rectangle (object 2)
  for (let y = 60; y < 90; y++) {
    for (let x = 60; x < 90; x++) {
      image.setPixelAt(x, y, 0x0000FFFF); // Blue
    }
  }
  // Draw a green rectangle (object 3)
  for (let y = 10; y < 40; y++) {
    for (let x = 60; x < 90; x++) {
      image.setPixelAt(x, y, 0x00FF00FF); // Green
    }
  }
  return await image.encode(1); // PNG format
}

// System instruction for object detection
const DETECTION_SYSTEM_INSTRUCTION = `
You are a visual detection assistant that names detected objects based on image context.

STEP 1 - DETECT CONTEXT:
Determine whether the image represents a webpage.

Consider it a webpage if you detect multiple web indicators such as:
- Browser UI (tabs, address bar, navigation buttons)
- Web-style layouts (menus, grids, form layouts)
- HTML controls (inputs, buttons, dropdowns)
- Web fonts or text rendering
- Visible URL or webpage content

STEP 2 - NAME ELEMENTS:
- If the image appears to be a webpage → use HTML element names
  (e.g., button, input, a, nav, header, section, h1-h6, p, img, video)
- Otherwise → use general object names based on visual meaning.

STEP 3 - OUTPUT FORMAT:
Return a valid JSON array (no text outside JSON) with:
{
  "object": "<name based on context>",
  "label": "<short description>",
  "normalized_box_2d": [ymin, xmin, ymax, xmax] // normalized (0-1000)
}

Bounding box rules:
- Tightly fit visible area (exclude shadows/whitespace)
- Avoid overlap when separable
- Maintain ymin < ymax and xmin < xmax
- Differentiate duplicates by traits (e.g., color, position)
`;

// Detection schema
const DETECTION_SCHEMA = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      object: {
        type: 'string',
        description: 'Generic category for detected object element.',
      },
      label: {
        type: 'string',
        description: 'Descriptive label or instance-specific detail.',
      },
      normalized_box_2d: {
        type: 'array',
        minItems: 4,
        maxItems: 4,
        items: {
          type: 'integer',
        },
        description:
          'Bounding box coordinates [ymin, xmin, ymax, xmax], normalized to 0-1000',
      },
    },
    required: ['object', 'label', 'normalized_box_2d'],
  },
};

// Simple prompt without system instruction
const SIMPLE_PROMPT = `Detect all prominent items in the image. Return a JSON array where each item has:
- "object": the type of object (e.g., "rectangle", "button", "text")
- "label": a brief description
- "normalized_box_2d": bounding box as [ymin, xmin, ymax, xmax] normalized to 0-1000 scale`;

async function testApproach1_WithSchema(client, model, imageBuffer) {
  console.log('\n=== APPROACH 1: With responseSchema (current codebase approach) ===');
  try {
    const base64Data = imageBuffer.toString('base64');
    const content = {
      inlineData: {
        mimeType: 'image/png',
        data: base64Data,
      },
    };

    const response = await client.models.generateContent({
      model,
      contents: [content, { text: 'Detect objects in this image' }],
      config: {
        temperature: 0,
        topP: 0.95,
        topK: 30,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: DETECTION_SCHEMA,
        systemInstruction: DETECTION_SYSTEM_INSTRUCTION,
      },
    });

    console.log('Response text:', response.text);
    console.log('Success! Parsed detections:', JSON.parse(response.text).length, 'objects');
    return { success: true, count: JSON.parse(response.text).length };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testApproach2_JustMimeType(client, model, imageBuffer) {
  console.log('\n=== APPROACH 2: Just responseMimeType (like Google Python example) ===');
  try {
    const base64Data = imageBuffer.toString('base64');
    const content = {
      inlineData: {
        mimeType: 'image/png',
        data: base64Data,
      },
    };

    const response = await client.models.generateContent({
      model,
      contents: [content, { text: SIMPLE_PROMPT }],
      config: {
        temperature: 0,
        topP: 0.95,
        topK: 30,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        // NO responseSchema
        // NO systemInstruction
      },
    });

    console.log('Response text:', response.text);
    console.log('Success! Parsed detections:', JSON.parse(response.text).length, 'objects');
    return { success: true, count: JSON.parse(response.text).length };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testApproach3_NoImageScript(client, model) {
  console.log('\n=== APPROACH 3: Without ImageScript (using raw base64 from constant) ===');
  try {
    const content = {
      inlineData: {
        mimeType: 'image/png',
        data: TEST_IMAGE_BASE64,
      },
    };

    const response = await client.models.generateContent({
      model,
      contents: [content, { text: SIMPLE_PROMPT }],
      config: {
        temperature: 0,
        topP: 0.95,
        topK: 30,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });

    console.log('Response text:', response.text);
    console.log('Success! Parsed detections:', JSON.parse(response.text).length, 'objects');
    return { success: true, count: JSON.parse(response.text).length };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testApproach4_TextPromptOnly(client, model, imageBuffer) {
  console.log('\n=== APPROACH 4: Text-only prompt (no system instruction) ===');
  try {
    const base64Data = imageBuffer.toString('base64');
    const content = {
      inlineData: {
        mimeType: 'image/png',
        data: base64Data,
      },
    };

    const prompt = `Detect the all of the prominent items in the image. The box_2d should be [ymin, xmin, ymax, xmax] normalized to 0-1000.

Return ONLY a JSON array like this:
[
  {
    "object": "rectangle",
    "label": "red rectangle",
    "normalized_box_2d": [100, 100, 400, 400]
  }
]`;

    const response = await client.models.generateContent({
      model,
      contents: [content, { text: prompt }],
      config: {
        temperature: 0,
        topP: 0.95,
        topK: 30,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });

    console.log('Response text:', response.text);
    console.log('Success! Parsed detections:', JSON.parse(response.text).length, 'objects');
    return { success: true, count: JSON.parse(response.text).length };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const baseUrl = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
  const model = process.env.TEST_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    console.error('Error: GEMINI_API_KEY environment variable is required');
    process.exit(1);
  }

  console.log('Environment:');
  console.log('  Base URL:', baseUrl);
  console.log('  Model:', model);
  console.log('');

  // Set up the client
  setDefaultBaseUrls({ geminiUrl: baseUrl });
  const client = new GoogleGenAI({ apiKey });

  // Create test image
  console.log('Creating test image...');
  const testImageBuffer = await createTestImage();
  console.log('Test image size:', testImageBuffer.length, 'bytes');

  // Save test image for inspection
  const testImagePath = path.join(__dirname, 'test_image.png');
  fs.writeFileSync(testImagePath, testImageBuffer);
  console.log('Test image saved to:', testImagePath);

  // Run all approaches
  const results = {
    approach1: await testApproach1_WithSchema(client, model, testImageBuffer),
    approach2: await testApproach2_JustMimeType(client, model, testImageBuffer),
    approach3: await testApproach3_NoImageScript(client, model),
    approach4: await testApproach4_TextPromptOnly(client, model, testImageBuffer),
  };

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log('Approach 1 (with schema):', results.approach1.success ? 'SUCCESS' : 'FAILED', results.approach1.error || '');
  console.log('Approach 2 (just mimeType):', results.approach2.success ? 'SUCCESS' : 'FAILED', results.approach2.error || '');
  console.log('Approach 3 (no ImageScript):', results.approach3.success ? 'SUCCESS' : 'FAILED', results.approach3.error || '');
  console.log('Approach 4 (text prompt):', results.approach4.success ? 'SUCCESS' : 'FAILED', results.approach4.error || '');

  // Clean up
  try {
    fs.unlinkSync(testImagePath);
  } catch (e) {
    // ignore
  }
}

main().catch(console.error);
