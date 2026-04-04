#!/usr/bin/env node

/**
 * Test Gemini model availability
 *
 * Usage:
 *   node scripts/test_gemini_models.mjs
 *
 * Tests which Gemini models are available
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

// Load .env file from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
config({ path: envPath });

async function testGeminiModels() {
  console.log('🧪 Testing Gemini Model Availability...\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: GEMINI_API_KEY not found in .env file');
    process.exit(1);
  }

  const client = new GoogleGenAI({ apiKey });

  const modelsToTest = [
    'gemini-3.1-flash-lite-preview',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ];

  console.log('📋 Testing models:\n');

  for (const model of modelsToTest) {
    try {
      console.log(`  Testing: ${model}`);
      const result = await client.models.generateContent({
        model,
        contents: 'Say "OK"',
      });

      if (result.candidates && result.candidates.length > 0) {
        const text = result.candidates[0].content?.parts?.[0]?.text;
        console.log(`    ✅ Available - Response: "${text}"\n`);
      } else {
        console.log(`    ⚠️  No response received\n`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('404') || message.includes('not found')) {
        console.log(`    ❌ Not found (404)\n`);
      } else if (message.includes('permission') || message.includes('unauthorized')) {
        console.log(`    ❌ Permission denied\n`);
      } else {
        console.log(`    ❌ Error: ${message.substring(0, 80)}\n`);
      }
    }
  }

  console.log('✨ Model availability test complete!');
}

testGeminiModels();
