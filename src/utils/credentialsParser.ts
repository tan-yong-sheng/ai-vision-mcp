/**
 * Utility functions for parsing Google Cloud service account credentials
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
 * Parse Google Cloud service account credentials from a file path
 * @param credentialsPath - Path to the service account JSON file
 * @returns Parsed service account credentials
 */
export function parseServiceAccountCredentials(
  credentialsPath: string
): ServiceAccountCredentials {
  try {
    // Check if file exists
    if (!fs.existsSync(credentialsPath)) {
      throw new ConfigurationError(
        `Service account credentials file not found: ${credentialsPath}`,
        'VERTEX_CREDENTIALS'
      );
    }

    // Read and parse the JSON file
    const fileContent = fs.readFileSync(credentialsPath, 'utf-8');
    const credentials = JSON.parse(fileContent) as ServiceAccountCredentials;

    // Validate required fields
    if (!credentials.project_id) {
      throw new ConfigurationError(
        'Service account credentials file is missing "project_id" field',
        'VERTEX_CREDENTIALS'
      );
    }

    if (!credentials.private_key) {
      throw new ConfigurationError(
        'Service account credentials file is missing "private_key" field',
        'VERTEX_CREDENTIALS'
      );
    }

    if (!credentials.client_email) {
      throw new ConfigurationError(
        'Service account credentials file is missing "client_email" field',
        'VERTEX_CREDENTIALS'
      );
    }

    return credentials;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new ConfigurationError(
        `Invalid JSON in service account credentials file: ${credentialsPath}`,
        'VERTEX_CREDENTIALS'
      );
    }

    throw new ConfigurationError(
      `Failed to parse service account credentials: ${error instanceof Error ? error.message : String(error)}`,
      'VERTEX_CREDENTIALS'
    );
  }
}

/**
 * Extract project ID from service account credentials file
 * @param credentialsPath - Path to the service account JSON file
 * @returns Project ID from the credentials
 */
export function extractProjectIdFromCredentials(
  credentialsPath: string
): string {
  const credentials = parseServiceAccountCredentials(credentialsPath);
  return credentials.project_id;
}

/**
 * Validate service account credentials file format
 * @param credentialsPath - Path to the service account JSON file
 * @returns true if valid, throws error otherwise
 */
export function validateServiceAccountCredentials(
  credentialsPath: string
): boolean {
  parseServiceAccountCredentials(credentialsPath);
  return true;
}
