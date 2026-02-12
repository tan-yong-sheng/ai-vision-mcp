/**
 * Utility functions for parsing Google Cloud service account credentials
 *
 * Supports three credential formats:
 * 1. Base64-encoded JSON (recommended for cloud/secrets) - VERTEX_CREDENTIALS='eyJ0eXBlIjoi...'
 * 2. File path (recommended for local development) - VERTEX_CREDENTIALS='/path/to/service-account.json'
 * 3. Raw JSON string (may have escaping issues) - VERTEX_CREDENTIALS='{"type":"service_account",...}'
 */

import fs from 'fs';
import { ConfigurationError } from '../types/Errors.js';

export interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
}

/**
 * Check if a string looks like base64-encoded content
 * Base64 strings contain only alphanumeric characters, +, /, and = for padding
 */
function isBase64(str: string): boolean {
  // Base64 pattern: alphanumeric + /+ and = for padding
  const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
  // Must be reasonable length and match pattern
  return str.length > 50 && base64Pattern.test(str.replace(/\s/g, ''));
}

/**
 * Try to decode a base64 string
 * @returns Decoded string or null if not valid base64
 */
function tryDecodeBase64(str: string): string | null {
  try {
    const decoded = Buffer.from(str, 'base64').toString('utf-8');
    // Verify it's valid UTF-8 text
    if (decoded.includes('\ufffd')) {
      return null; // Contains replacement character = invalid
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Validate that parsed credentials have all required fields
 */
function validateCredentials(
  credentials: ServiceAccountCredentials,
  source: string
): void {
  if (!credentials.project_id) {
    throw new ConfigurationError(
      `Service account credentials ${source} is missing "project_id" field`,
      'VERTEX_CREDENTIALS'
    );
  }

  if (!credentials.private_key) {
    throw new ConfigurationError(
      `Service account credentials ${source} is missing "private_key" field`,
      'VERTEX_CREDENTIALS'
    );
  }

  if (!credentials.client_email) {
    throw new ConfigurationError(
      `Service account credentials ${source} is missing "client_email" field`,
      'VERTEX_CREDENTIALS'
    );
  }
}

/**
 * Parse JSON string into credentials object
 */
function parseJsonCredentials(
  jsonContent: string,
  source: string
): ServiceAccountCredentials {
  try {
    const credentials = JSON.parse(jsonContent) as ServiceAccountCredentials;
    validateCredentials(credentials, source);

    // Fix private_key: replace escaped \n with actual newlines
    // This is necessary when JSON is pasted as a secret (e.g., in GitHub Actions)
    // where the \n escape sequences are preserved as literal strings
    if (credentials.private_key && credentials.private_key.includes('\\n')) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    return credentials;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ConfigurationError(
        `Invalid JSON in service account credentials ${source}`,
        'VERTEX_CREDENTIALS'
      );
    }
    throw error;
  }
}

/**
 * Parse Google Cloud service account credentials
 *
 * Auto-detects format:
 * 1. If starts with '{' → Raw JSON string
 * 2. If looks like base64 and decodes to JSON → Base64-encoded JSON
 * 3. Otherwise → File path
 *
 * @param credentialsInput - One of: base64-encoded JSON, file path, or raw JSON string
 * @returns Parsed service account credentials
 */
export function parseServiceAccountCredentials(
  credentialsInput: string
): ServiceAccountCredentials {
  const trimmedInput = credentialsInput.trim();

  // Option 1: Raw JSON string (starts with '{')
  if (trimmedInput.startsWith('{')) {
    return parseJsonCredentials(trimmedInput, '(JSON string)');
  }

  // Option 2: Base64-encoded JSON
  if (isBase64(trimmedInput)) {
    const decoded = tryDecodeBase64(trimmedInput);
    if (decoded && decoded.startsWith('{')) {
      return parseJsonCredentials(decoded, '(base64 decoded)');
    }
  }

  // Option 3: File path
  try {
    if (!fs.existsSync(trimmedInput)) {
      throw new ConfigurationError(
        `Service account credentials file not found: ${trimmedInput}`,
        'VERTEX_CREDENTIALS'
      );
    }

    const fileContent = fs.readFileSync(trimmedInput, 'utf-8');
    return parseJsonCredentials(fileContent, `file: ${trimmedInput}`);
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }

    throw new ConfigurationError(
      `Failed to parse service account credentials: ${error instanceof Error ? error.message : String(error)}`,
      'VERTEX_CREDENTIALS'
    );
  }
}

/**
 * Extract project ID from service account credentials
 * @param credentialsInput - One of: base64-encoded JSON, file path, or raw JSON string
 * @returns Project ID from the credentials
 */
export function extractProjectIdFromCredentials(
  credentialsInput: string
): string {
  const credentials = parseServiceAccountCredentials(credentialsInput);
  return credentials.project_id;
}

/**
 * Validate service account credentials format
 * @param credentialsInput - One of: base64-encoded JSON, file path, or raw JSON string
 * @returns true if valid, throws error otherwise
 */
export function validateServiceAccountCredentials(
  credentialsInput: string
): boolean {
  parseServiceAccountCredentials(credentialsInput);
  return true;
}

/**
 * Get credentials as a JavaScript object (for passing to SDK)
 * This is useful when the SDK expects a credentials object instead of a file path
 *
 * @param credentialsInput - One of: base64-encoded JSON, file path, or raw JSON string
 * @returns Credentials object with client_email and private_key
 */
export function getCredentialsObject(credentialsInput: string): {
  client_email: string;
  private_key: string;
} {
  const credentials = parseServiceAccountCredentials(credentialsInput);
  return {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  };
}
