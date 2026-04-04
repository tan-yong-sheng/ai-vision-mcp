#!/usr/bin/env node

/**
 * Test Vertex AI credentials and connectivity
 *
 * Usage:
 *   node scripts/test_vertex_ai_credentials.mjs
 *
 * Loads credentials from .env file in project root
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

// Load .env file from project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
config({ path: envPath });

async function testVertexAICredentials() {
  console.log('🧪 Testing Vertex AI Credentials...\n');

  // Get configuration from environment
  const projectId = process.env.VERTEX_PROJECT_ID;
  const location = process.env.VERTEX_LOCATION || 'us-central1';
  const clientEmail = process.env.VERTEX_CLIENT_EMAIL;
  const privateKey = process.env.VERTEX_PRIVATE_KEY;

  if (!projectId) {
    console.error('❌ Error: VERTEX_PROJECT_ID not found in .env file');
    console.error(`   Checked: ${envPath}`);
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   Project ID: ${projectId}`);
  console.log(`   Location: ${location}`);
  console.log(`   Auth: ${clientEmail ? 'Service Account' : 'Application Default Credentials (ADC)'}`);
  if (clientEmail) {
    console.log(`   Service Account: ${clientEmail}`);
  }
  console.log();

  try {
    // Initialize GoogleGenAI client for Vertex AI
    console.log('🔧 Initializing GoogleGenAI client...');

    const clientConfig = {
      vertexai: true,
      project: projectId,
      location: location,
    };

    // Add credentials if provided
    if (clientEmail && privateKey) {
      clientConfig.googleAuthOptions = {
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
      };
    }

    const client = new GoogleGenAI(clientConfig);
    console.log('✅ Client initialized successfully\n');

    // Test text generation
    console.log('📝 Testing text generation...');

    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Say "Hello from Vertex AI!" in exactly those words.',
    });

    if (result.candidates && result.candidates.length > 0) {
      const text = result.candidates[0].content?.parts?.[0]?.text;
      if (text) {
        console.log('✅ Text generation successful!\n');
        console.log('📤 Response:');
        console.log(`   ${text}\n`);
        console.log('✨ Vertex AI credentials are working correctly!');
        process.exit(0);
      }
    }

    console.error('❌ Error: No response text received');
    process.exit(1);
  } catch (error) {
    console.error('❌ Error testing Vertex AI credentials:\n');

    if (error.message) {
      console.error(`   Message: ${error.message}`);
    }

    if (error.status) {
      console.error(`   Status: ${error.status}`);
    }

    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }

    // Provide helpful error messages
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      console.error('\n💡 Hint: Model not found. Check that:');
      console.error('   - The model "gemini-2.5-flash" is available in your region');
      console.error('   - Your project has access to Vertex AI Generative AI API');
      console.error('   - The location is correct');
    } else if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
      console.error('\n💡 Hint: Permission denied. Check that:');
      console.error('   - Service account has "Vertex AI User" role');
      console.error('   - Credentials are valid and not expired');
      console.error('   - Project ID is correct');
    } else if (error.message?.includes('ENOENT') || error.message?.includes('not found')) {
      console.error('\n💡 Hint: Credentials file not found. Check that:');
      console.error('   - VERTEX_PRIVATE_KEY is set correctly in .env');
      console.error('   - VERTEX_CLIENT_EMAIL is set correctly in .env');
      console.error('   - Or use Application Default Credentials (gcloud auth application-default login)');
    }

    console.error('\n📚 For more information, see:');
    console.error('   https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/api-quickstart');

    process.exit(1);
  }
}

testVertexAICredentials();
