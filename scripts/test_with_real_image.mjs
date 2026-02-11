/**
 * Test object detection with a real image from URL
 * This tests if the issue is with the image content or the API/proxy
 */

import { GoogleGenAI, setDefaultBaseUrls } from '@google/genai';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const baseUrl = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
const model = process.env.TEST_MODEL || 'gemini-2.5-flash';

if (!apiKey) {
  console.error('Error: GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

setDefaultBaseUrls({ geminiUrl: baseUrl });
const client = new GoogleGenAI({ apiKey });

// Use a real test image from Pexels (small, reliable)
const TEST_IMAGE_URL = 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=300';

async function fetchImage(url) {
  console.log('Fetching image from:', url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  console.log('Fetched image size:', buffer.length, 'bytes');
  return buffer;
}

async function testWithSchema(imageBuffer) {
  console.log('\n=== TEST: With responseSchema ===');
  try {
    const response = await client.models.generateContent({
      model,
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBuffer.toString('base64'),
          },
        },
        { text: 'Detect objects in this image' },
      ],
      config: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              object: { type: 'string' },
              label: { type: 'string' },
              normalized_box_2d: {
                type: 'array',
                items: { type: 'integer' },
                minItems: 4,
                maxItems: 4,
              },
            },
            required: ['object', 'label', 'normalized_box_2d'],
          },
        },
      },
    });

    console.log('Response:', response.text.substring(0, 500));
    const parsed = JSON.parse(response.text);
    console.log('Success! Detected', parsed.length, 'objects');
    return { success: true, count: parsed.length };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testWithMimeTypeOnly(imageBuffer) {
  console.log('\n=== TEST: With responseMimeType only ===');
  try {
    const response = await client.models.generateContent({
      model,
      contents: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBuffer.toString('base64'),
          },
        },
        {
          text: 'Detect all prominent items in the image. Return a JSON array with object name, label, and normalized_box_2d as [ymin, xmin, ymax, xmax] on 0-1000 scale.'
        },
      ],
      config: {
        temperature: 0,
        responseMimeType: 'application/json',
        // NO responseSchema
      },
    });

    console.log('Response:', response.text.substring(0, 500));
    const parsed = JSON.parse(response.text);
    console.log('Success! Detected', parsed.length, 'objects');
    return { success: true, count: parsed.length };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('Object Detection Test with Real Image');
  console.log('======================================');
  console.log('Base URL:', baseUrl);
  console.log('Model:', model);
  console.log('Image URL:', TEST_IMAGE_URL);

  try {
    const imageBuffer = await fetchImage(TEST_IMAGE_URL);

    const result1 = await testWithSchema(imageBuffer);
    const result2 = await testWithMimeTypeOnly(imageBuffer);

    console.log('\n=== SUMMARY ===');
    console.log('With schema:', result1.success ? 'PASS' : 'FAIL');
    console.log('With mimeType only:', result2.success ? 'PASS' : 'FAIL');

    if (result1.success && !result2.success) {
      console.log('\nSchema is required for this proxy');
    } else if (!result1.success && result2.success) {
      console.log('\n*** Schema causes issues - use mimeType only! ***');
    } else if (!result1.success && !result2.success) {
      console.log('\n*** Both approaches fail - proxy/API issue ***');
    }
  } catch (e) {
    console.error('Failed to fetch image:', e.message);
  }
}

main().catch(console.error);
