/**
 * Test if Bifrost proxy accepts responseJsonSchema instead of responseSchema
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

// Use a real test image from Pexels
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

// Test 1: Using responseSchema (current SDK way)
async function testWithResponseSchema(imageBuffer) {
  console.log('\n=== TEST 1: With responseSchema (SDK default) ===');
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

// Test 2: Using responseJsonSchema (what Bifrost/Gemini API expects)
async function testWithResponseJsonSchema(imageBuffer) {
  console.log('\n=== TEST 2: With responseJsonSchema (API native) ===');
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
        responseJsonSchema: {
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

// Test 3: Raw HTTP call with responseJsonSchema
async function testRawHttpWithJsonSchema(imageBuffer) {
  console.log('\n=== TEST 3: Raw HTTP with responseJsonSchema ===');
  try {
    const response = await fetch(`${baseUrl}/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageBuffer.toString('base64'),
                },
              },
              {
                text: 'Detect objects in this image',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseJsonSchema: {
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
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('HTTP Error:', data);
      return { success: false, error: JSON.stringify(data) };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('Response:', text?.substring(0, 500));
    const parsed = JSON.parse(text);
    console.log('Success! Detected', parsed.length, 'objects');
    return { success: true, count: parsed.length };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('Testing responseJsonSchema vs responseSchema');
  console.log('============================================');
  console.log('Base URL:', baseUrl);
  console.log('Model:', model);
  console.log('');

  try {
    const imageBuffer = await fetchImage(TEST_IMAGE_URL);

    const result1 = await testWithResponseSchema(imageBuffer);
    const result2 = await testWithResponseJsonSchema(imageBuffer);
    const result3 = await testRawHttpWithJsonSchema(imageBuffer);

    console.log('\n=== SUMMARY ===');
    console.log('Test 1 (responseSchema):', result1.success ? '✅ PASS' : '❌ FAIL');
    console.log('Test 2 (responseJsonSchema via SDK):', result2.success ? '✅ PASS' : '❌ FAIL');
    console.log('Test 3 (responseJsonSchema raw HTTP):', result3.success ? '✅ PASS' : '❌ FAIL');

    if (result2.success || result3.success) {
      console.log('\n*** responseJsonSchema WORKS! Should update codebase ***');
    } else if (!result1.success && !result2.success && !result3.success) {
      console.log('\n*** All approaches fail - proxy limitation ***');
    }
  } catch (e) {
    console.error('Failed:', e.message);
  }
}

main().catch(console.error);
