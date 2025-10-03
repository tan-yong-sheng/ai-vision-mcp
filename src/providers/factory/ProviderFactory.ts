/**
 * Provider factory for creating and managing vision providers
 */

import type { VisionProvider, ProviderFactory } from '../../types/Providers.js';
import type { Config } from '../../types/Config.js';
import { GeminiProvider } from '../gemini/GeminiProvider.js';
import { VertexAIProvider } from '../vertexai/VertexAIProvider.js';
import { ConfigurationError, ProviderError } from '../../types/Errors.js';
import { ConfigService } from '../../services/ConfigService.js';

export class VisionProviderFactory {
  private static providers = new Map<string, () => VisionProvider>();

  /**
   * Register a new provider with the factory
   */
  static registerProvider(name: string, factory: () => VisionProvider): void {
    this.providers.set(name, factory);
  }

  /**
   * Create a provider instance based on configuration
   */
  static createProvider(
    config: Config,
    type: 'image' | 'video'
  ): VisionProvider {
    const providerName =
      (config as any)[`${type.toUpperCase()}_PROVIDER`] || 'google';
    const factory = this.providers.get(providerName);

    if (!factory) {
      throw new ConfigurationError(`Unsupported provider: ${providerName}`);
    }

    try {
      const provider = factory();

      // Set default models if not configured
      const defaultModels = this.getDefaultModels(providerName);
      provider.setModel(
        config.IMAGE_MODEL || defaultModels.image,
        config.VIDEO_MODEL || defaultModels.video
      );

      return provider;
    } catch (error) {
      throw new ProviderError(
        `Failed to create ${providerName} provider: ${error instanceof Error ? error.message : String(error)}`,
        providerName,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Get list of supported providers
   */
  static getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is supported
   */
  static isProviderSupported(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  /**
   * Auto-detect provider from model name
   */
  static detectProviderFromModel(modelName: string): string {
    if (modelName.startsWith('gemini-') || modelName.startsWith('aistudio-')) {
      return 'google';
    }
    if (modelName.startsWith('vertex-') || modelName.startsWith('gcp-')) {
      return 'vertex_ai';
    }
    if (
      modelName.startsWith('gpt-') ||
      modelName.startsWith('davinci-') ||
      modelName.startsWith('claude-')
    ) {
      // Future support for OpenAI/Claude
      return 'openai';
    }

    // Default to Gemini
    return 'google';
  }

  /**
   * Get provider-specific configuration validation rules
   */
  static getProviderConfigRequirements(providerName: string): string[] {
    switch (providerName) {
      case 'google':
        return ['GEMINI_API_KEY'];

      case 'vertex_ai':
        return [
          'GOOGLE_APPLICATION_CREDENTIALS',
          'VERTEX_PROJECT_ID',
          'VERTEX_LOCATION',
        ];

      default:
        return [];
    }
  }

  /**
   * Validate provider configuration
   */
  static validateProviderConfig(config: Config, providerName: string): void {
    const requirements = this.getProviderConfigRequirements(providerName);
    const missing = requirements.filter(req => {
      const value = config[req as keyof Config];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (missing.length > 0) {
      throw new ConfigurationError(
        `Missing required configuration for ${providerName}: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Get default models for each provider
   */
  private static getDefaultModels(providerName: string): {
    image: string;
    video: string;
  } {
    switch (providerName) {
      case 'google':
        return {
          image: 'gemini-2.5-flash-lite',
          video: 'gemini-2.5-flash',
        };

      case 'vertex_ai':
        return {
          image: 'gemini-2.5-flash-lite',
          video: 'gemini-2.5-flash',
        };

      default:
        return {
          image: 'gemini-2.5-flash-lite',
          video: 'gemini-2.5-flash',
        };
    }
  }

  /**
   * Initialize default providers
   */
  static initializeDefaultProviders(): void {
    // Register Gemini API provider
    this.registerProvider('google', () => {
      // Create a basic provider instance - it will be configured properly when used
      const provider = new GeminiProvider({} as any);
      return provider;
    });

    // Register Vertex AI provider
    this.registerProvider('vertex_ai', () => {
      // Create a basic provider instance - it will be configured properly when used
      const provider = new VertexAIProvider({} as any);
      return provider;
    });
  }

  /**
   * Create provider with configuration validation
   */
  static createProviderWithValidation(
    config: Config,
    type: 'image' | 'video'
  ): VisionProvider {
    const providerName =
      (config as any)[`${type.toUpperCase()}_PROVIDER`] || 'google';

    // Validate configuration before creating provider
    this.validateProviderConfig(config, providerName);

    // Create the provider and properly configure it
    const factory = this.providers.get(providerName);
    if (!factory) {
      throw new ConfigurationError(`Unsupported provider: ${providerName}`);
    }

    try {
      const provider = factory();

      // Configure the provider with proper configuration
      if (providerName === 'google') {
        const geminiConfig = ConfigService.getInstance().getGeminiConfig();
        // Create a new provider instance with proper config
        return new GeminiProvider(geminiConfig);
      } else if (providerName === 'vertex_ai') {
        const vertexConfig = ConfigService.getInstance().getVertexAIConfig();
        // Create a new provider instance with proper config
        return new VertexAIProvider(vertexConfig);
      }

      return provider;
    } catch (error) {
      throw new ProviderError(
        `Failed to create ${providerName} provider: ${error instanceof Error ? error.message : String(error)}`,
        providerName,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

// Initialize default providers when module is loaded
VisionProviderFactory.initializeDefaultProviders();
