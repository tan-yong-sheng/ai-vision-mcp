#!/usr/bin/env node

/**
 * Test Vertex AI model availability
 *
 * Usage:
 *   node scripts/test_vertexai_models.mjs
 *
 * Tests which Gemini models are available via Vertex AI
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

// Load .env file from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
config({ path: envPath });

async function testVertexAIModels() {
  console.log('🧪 Testing Vertex AI Model Availability...\n');

  const projectId = process.env.VERTEX_PROJECT_ID;
  const location = process.env.VERTEX_LOCATION || 'us-central1';
  const clientEmail = process.env.VERTEX_CLIENT_EMAIL;
  const privateKey = process.env.VERTEX_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Error: Missing Vertex AI credentials in .env file');
    console.error('   Required: VERTEX_PROJECT_ID, VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY');
    process.exit(1);
  }

  const client = new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location: location,
    googleAuthOptions: {
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    },
  });

  const modelsToTest = [
    'gemini-3.1-flash-lite-preview'
  ];

  console.log(`📋 Testing models via Vertex AI (${projectId}, ${location}):\n`);

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
      } else if (message.includes('INVALID_ARGUMENT')) {
        console.log(`    ❌ Invalid argument (model may not exist in this region)\n`);
      } else {
        console.log(`    ❌ Error: ${message.substring(0, 80)}\n`);
      }
    }
  }

  console.log('✨ Model availability test complete!');
}

testVertexAIModels();
