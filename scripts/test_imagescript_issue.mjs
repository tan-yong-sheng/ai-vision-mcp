/**
 * Test to determine if ImageScript is causing object detection failures
 *
 * The issue: When ImageScript.decode() is called on certain images,
 * it may modify the image buffer in ways that cause the Gemini API
 * to return "Invalid JSON" errors.
 *
 * This test:
 * 1. Creates a test image
 * 2. Tests API call with original buffer
 * 3. Tests API call after ImageScript.decode()
 * 4. Compares results
 */

import { GoogleGenAI, setDefaultBaseUrls } from '@google/genai';
import dotenv from 'dotenv';
import { Image } from 'imagescript';

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

// Create a simple test image
async function createTestImage() {
  const image = new Image(100, 100);
  image.fill(0xFFFFFFFF); // White background

  // Draw a red rectangle
  for (let y = 10; y < 40; y++) {
    for (let x = 10; x < 40; x++) {
      image.setPixelAt(x, y, 0xFF0000FF);
    }
  }

  return await image.encode(1); // PNG
}

// Test API call
async function testAPICall(buffer, label) {
  console.log(`\n--- Testing: ${label} ---`);
  console.log(`Buffer size: ${buffer.length} bytes`);
  console.log(`First 20 bytes: ${buffer.slice(0, 20).toString('hex')}`);

  try {
    const response = await client.models.generateContent({
      model,
      contents: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: buffer.toString('base64'),
          },
        },
        {
          text: 'Detect all prominent items in the image. Return a JSON array with object, label, and normalized_box_2d [ymin, xmin, ymax, xmax] normalized to 0-1000.'
        },
      ],
      config: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    });

    console.log('Response:', response.text.substring(0, 200));
    console.log('Status: SUCCESS');
    return { success: true };
  } catch (error) {
    console.error('Error:', error.message);
    console.log('Status: FAILED');
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('ImageScript Issue Test');
  console.log('======================');
  console.log('Base URL:', baseUrl);
  console.log('Model:', model);

  // Create test image
  const originalBuffer = await createTestImage();

  // Test 1: Original buffer (before ImageScript)
  const result1 = await testAPICall(originalBuffer, 'Original buffer (before ImageScript.decode)');

  // Decode with ImageScript (like the codebase does)
  console.log('\n[Running ImageScript.decode()...]');
  let decodedImage;
  try {
    decodedImage = await Image.decode(originalBuffer);
    console.log('Decoded image size:', decodedImage.width, 'x', decodedImage.height);
  } catch (e) {
    console.error('ImageScript decode failed:', e.message);
  }

  // Test 2: Re-encode with ImageScript (this is what the codebase does for annotations)
  let reencodedBuffer;
  try {
    reencodedBuffer = await decodedImage.encode(1);
    console.log('Re-encoded buffer size:', reencodedBuffer.length, 'bytes');
  } catch (e) {
    console.error('ImageScript encode failed:', e.message);
  }

  const result2 = await testAPICall(reencodedBuffer, 'Re-encoded buffer (after ImageScript.encode)');

  // Test 3: Original buffer again (to check if it's a timing/ API issue)
  const result3 = await testAPICall(originalBuffer, 'Original buffer (second call - checking consistency)');

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log('Test 1 (Original):', result1.success ? 'PASS' : 'FAIL');
  console.log('Test 2 (Re-encoded):', result2.success ? 'PASS' : 'FAIL');
  console.log('Test 3 (Original again):', result3.success ? 'PASS' : 'FAIL');

  if (result1.success && !result2.success) {
    console.log('\n*** CONCLUSION: ImageScript is likely causing the issue! ***');
    console.log('The re-encoded buffer from ImageScript causes API failures.');
  } else if (!result1.success && !result2.success) {
    console.log('\n*** CONCLUSION: API issue unrelated to ImageScript ***');
    console.log('Both original and re-encoded buffers fail.');
  } else if (result1.success && result2.success) {
    console.log('\n*** CONCLUSION: ImageScript is NOT the issue ***');
    console.log('Both approaches work fine.');
  }
}

main().catch(console.error);
