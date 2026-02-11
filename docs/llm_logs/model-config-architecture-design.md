# Model Configuration Architecture Design

## Research Summary

### Current State
- Models are hardcoded in `BaseVisionProvider.resolveModelForFunction()`:
  - Image default: `gemini-2.5-flash-lite`
  - Video default: `gemini-2.5-flash`
- Model thinking budgets hardcoded in `getThinkingBudgetForModel()`
- Environment variable overrides exist but are string-based without validation
- No centralized model registry or capability discovery

### Existing Configuration Hierarchy
1. LLM-assigned values (tool parameters)
2. Function-specific env vars (e.g., `ANALYZE_IMAGE_MODEL`)
3. Task-specific env vars (e.g., `IMAGE_MODEL`)
4. System defaults (hardcoded)

---

## Proposed Architecture

### 1. config/models.json Structure

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-15",
  "models": {
    "gemini-2.5-flash-lite": {
      "id": "gemini-2.5-flash-lite-preview-06-17",
      "aliases": ["flash-lite", "gemini-flash-lite"],
      "displayName": "Gemini 2.5 Flash Lite",
      "provider": "google",
      "capabilities": {
        "supportsVision": true,
        "supportsThinking": true,
        "supportsVideo": true,
        "supportsStructuredOutput": true,
        "maxContextTokens": 1048576,
        "maxOutputTokens": 8192,
        "supportedImageFormats": ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff", "heic", "heif"],
        "supportedVideoFormats": ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "3gp", "m4v"]
      },
      "thinking": {
        "enabled": true,
        "defaultBudget": 0,
        "budgetRange": { "min": 0, "max": 24576 }
      },
      "defaults": {
        "temperature": 0.8,
        "topP": 0.95,
        "topK": 30,
        "maxTokens": 1000
      },
      "deprecated": false,
      "description": "Fast, cost-efficient model for most vision tasks"
    },
    "gemini-2.5-flash": {
      "id": "gemini-2.5-flash-preview-05-20",
      "aliases": ["flash", "gemini-flash"],
      "displayName": "Gemini 2.5 Flash",
      "provider": "google",
      "capabilities": {
        "supportsVision": true,
        "supportsThinking": true,
        "supportsVideo": true,
        "supportsStructuredOutput": true,
        "maxContextTokens": 1048576,
        "maxOutputTokens": 8192,
        "supportedImageFormats": ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff", "heic", "heif"],
        "supportedVideoFormats": ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "3gp", "m4v"]
      },
      "thinking": {
        "enabled": true,
        "defaultBudget": 0,
        "budgetRange": { "min": 0, "max": 24576 }
      },
      "defaults": {
        "temperature": 0.8,
        "topP": 0.95,
        "topK": 30,
        "maxTokens": 2000
      },
      "deprecated": false,
      "description": "Fast model with good quality for video and complex images"
    },
    "gemini-2.5-pro": {
      "id": "gemini-2.5-pro-preview-06-05",
      "aliases": ["pro", "gemini-pro"],
      "displayName": "Gemini 2.5 Pro",
      "provider": "google",
      "capabilities": {
        "supportsVision": true,
        "supportsThinking": true,
        "supportsVideo": true,
        "supportsStructuredOutput": true,
        "maxContextTokens": 1048576,
        "maxOutputTokens": 65536,
        "supportedImageFormats": ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff", "heic", "heif"],
        "supportedVideoFormats": ["mp4", "mov", "avi", "mkv", "webm", "flv", "wmv", "3gp", "m4v"]
      },
      "thinking": {
        "enabled": true,
        "defaultBudget": 128,
        "budgetRange": { "min": 0, "max": 24576 }
      },
      "defaults": {
        "temperature": 0.7,
        "topP": 0.95,
        "topK": 30,
        "maxTokens": 4096
      },
      "deprecated": false,
      "description": "Highest quality model for complex reasoning tasks"
    }
  },
  "taskDefaults": {
    "image": "gemini-2.5-flash-lite",
    "video": "gemini-2.5-flash"
  },
  "functionDefaults": {
    "analyze_image": "gemini-2.5-flash-lite",
    "compare_images": "gemini-2.5-flash-lite",
    "detect_objects_in_image": "gemini-2.5-flash-lite",
    "analyze_video": "gemini-2.5-flash"
  }
}
```

### 2. TypeScript Interfaces

```typescript
// src/types/ModelConfig.ts

export type Provider = 'google' | 'vertex_ai';

export interface ModelCapabilities {
  supportsVision: boolean;
  supportsThinking: boolean;
  supportsVideo: boolean;
  supportsStructuredOutput: boolean;
  maxContextTokens: number;
  maxOutputTokens: number;
  supportedImageFormats: string[];
  supportedVideoFormats: string[];
}

export interface ThinkingConfig {
  enabled: boolean;
  defaultBudget: number;
  budgetRange: {
    min: number;
    max: number;
  };
}

export interface ModelDefaults {
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
}

export interface ModelDefinition {
  id: string;                    // Actual API model ID
  aliases: string[];             // Friendly names that map to this model
  displayName: string;           // Human-readable name
  provider: Provider;
  capabilities: ModelCapabilities;
  thinking: ThinkingConfig;
  defaults: ModelDefaults;
  deprecated: boolean;
  deprecationDate?: string;      // ISO date when model will be deprecated
  replacementModel?: string;     // Suggested replacement if deprecated
  description: string;
}

export interface ModelsConfig {
  version: string;
  lastUpdated: string;
  models: Record<string, ModelDefinition>;  // Key is the alias/key used in code
  taskDefaults: {
    image: string;
    video: string;
  };
  functionDefaults: Record<string, string>;
}
```

### 3. Zod Validation Schema

```typescript
// src/utils/validation.ts (additions)

const ModelCapabilitiesSchema = z.object({
  supportsVision: z.boolean(),
  supportsThinking: z.boolean(),
  supportsVideo: z.boolean(),
  supportsStructuredOutput: z.boolean(),
  maxContextTokens: z.number().int().positive(),
  maxOutputTokens: z.number().int().positive(),
  supportedImageFormats: z.array(z.string()),
  supportedVideoFormats: z.array(z.string()),
});

const ThinkingConfigSchema = z.object({
  enabled: z.boolean(),
  defaultBudget: z.number().int().min(0),
  budgetRange: z.object({
    min: z.number().int().min(0),
    max: z.number().int().min(0),
  }),
});

const ModelDefaultsSchema = z.object({
  temperature: z.number().min(0).max(2),
  topP: z.number().min(0).max(1),
  topK: z.number().int().positive(),
  maxTokens: z.number().int().positive(),
});

const ModelDefinitionSchema = z.object({
  id: z.string().min(1),
  aliases: z.array(z.string()),
  displayName: z.string().min(1),
  provider: z.enum(['google', 'vertex_ai']),
  capabilities: ModelCapabilitiesSchema,
  thinking: ThinkingConfigSchema,
  defaults: ModelDefaultsSchema,
  deprecated: z.boolean(),
  deprecationDate: z.string().datetime().optional(),
  replacementModel: z.string().optional(),
  description: z.string(),
});

export const ModelsConfigSchema = z.object({
  version: z.string(),
  lastUpdated: z.string().datetime(),
  models: z.record(z.string(), ModelDefinitionSchema),
  taskDefaults: z.object({
    image: z.string(),
    video: z.string(),
  }),
  functionDefaults: z.record(z.string(), z.string()),
});

export const validateModelsConfig = (config: unknown): ModelsConfig => {
  return ModelsConfigSchema.parse(config);
};
```

### 4. Loading Strategy

```typescript
// src/services/ModelConfigService.ts

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ModelsConfig, ModelDefinition } from '../types/ModelConfig.js';
import { validateModelsConfig, formatZodError } from '../utils/validation.js';
import { ConfigurationError } from '../types/Errors.js';

const DEFAULT_CONFIG_PATH = './config/models.json';

// Embedded fallback configuration for when file is missing
const FALLBACK_CONFIG: ModelsConfig = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  models: {
    'gemini-2.5-flash-lite': {
      id: 'gemini-2.5-flash-lite-preview-06-17',
      aliases: ['flash-lite', 'gemini-flash-lite'],
      displayName: 'Gemini 2.5 Flash Lite',
      provider: 'google',
      capabilities: {
        supportsVision: true,
        supportsThinking: true,
        supportsVideo: true,
        supportsStructuredOutput: true,
        maxContextTokens: 1048576,
        maxOutputTokens: 8192,
        supportedImageFormats: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'heic', 'heif'],
        supportedVideoFormats: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', '3gp', 'm4v'],
      },
      thinking: {
        enabled: true,
        defaultBudget: 0,
        budgetRange: { min: 0, max: 24576 },
      },
      defaults: {
        temperature: 0.8,
        topP: 0.95,
        topK: 30,
        maxTokens: 1000,
      },
      deprecated: false,
      description: 'Fast, cost-efficient model for most vision tasks',
    },
    'gemini-2.5-flash': {
      id: 'gemini-2.5-flash-preview-05-20',
      aliases: ['flash', 'gemini-flash'],
      displayName: 'Gemini 2.5 Flash',
      provider: 'google',
      capabilities: {
        supportsVision: true,
        supportsThinking: true,
        supportsVideo: true,
        supportsStructuredOutput: true,
        maxContextTokens: 1048576,
        maxOutputTokens: 8192,
        supportedImageFormats: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'heic', 'heif'],
        supportedVideoFormats: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', '3gp', 'm4v'],
      },
      thinking: {
        enabled: true,
        defaultBudget: 0,
        budgetRange: { min: 0, max: 24576 },
      },
      defaults: {
        temperature: 0.8,
        topP: 0.95,
        topK: 30,
        maxTokens: 2000,
      },
      deprecated: false,
      description: 'Fast model with good quality for video and complex images',
    },
  },
  taskDefaults: {
    image: 'gemini-2.5-flash-lite',
    video: 'gemini-2.5-flash',
  },
  functionDefaults: {
    analyze_image: 'gemini-2.5-flash-lite',
    compare_images: 'gemini-2.5-flash-lite',
    detect_objects_in_image: 'gemini-2.5-flash-lite',
    analyze_video: 'gemini-2.5-flash',
  },
};

export class ModelConfigService {
  private static instance: ModelConfigService;
  private config: ModelsConfig;
  private modelAliasMap: Map<string, string> = new Map();

  private constructor(configPath?: string) {
    this.config = this.loadConfig(configPath);
    this.buildAliasMap();
  }

  public static getInstance(configPath?: string): ModelConfigService {
    if (!ModelConfigService.instance) {
      ModelConfigService.instance = new ModelConfigService(configPath);
    }
    return ModelConfigService.instance;
  }

  public static resetInstance(): void {
    ModelConfigService.instance = undefined as any;
  }

  private loadConfig(configPath?: string): ModelsConfig {
    const path = configPath || process.env.MODELS_CONFIG_PATH || DEFAULT_CONFIG_PATH;
    const fullPath = resolve(path);

    if (!existsSync(fullPath)) {
      console.error(`[ModelConfigService] Config file not found at ${fullPath}, using fallback configuration`);
      return FALLBACK_CONFIG;
    }

    try {
      const fileContent = readFileSync(fullPath, 'utf-8');
      const parsedConfig = JSON.parse(fileContent);
      const validatedConfig = validateModelsConfig(parsedConfig);
      console.error(`[ModelConfigService] Loaded configuration from ${fullPath}`);
      return validatedConfig;
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        throw new ConfigurationError(
          `Invalid models configuration: ${formatZodError(error as any)}`
        );
      }
      if (error instanceof SyntaxError) {
        throw new ConfigurationError(`Invalid JSON in models configuration: ${error.message}`);
      }
      throw new ConfigurationError(`Failed to load models configuration: ${error}`);
    }
  }

  private buildAliasMap(): void {
    // Build reverse mapping from aliases to model keys
    for (const [key, model] of Object.entries(this.config.models)) {
      // Map the primary key
      this.modelAliasMap.set(key.toLowerCase(), key);
      // Map all aliases
      for (const alias of model.aliases) {
        this.modelAliasMap.set(alias.toLowerCase(), key);
      }
    }
  }

  /**
   * Resolve a model reference (key or alias) to the canonical model key
   */
  public resolveModelKey(modelRef: string): string | undefined {
    return this.modelAliasMap.get(modelRef.toLowerCase());
  }

  /**
   * Get model definition by key or alias
   */
  public getModel(modelRef: string): ModelDefinition | undefined {
    const key = this.resolveModelKey(modelRef);
    if (!key) return undefined;
    return this.config.models[key];
  }

  /**
   * Get the actual API model ID for a model reference
   */
  public resolveModelId(modelRef: string): string | undefined {
    const model = this.getModel(modelRef);
    return model?.id;
  }

  /**
   * Get model for a specific task type
   */
  public getModelForTask(taskType: 'image' | 'video'): ModelDefinition {
    const defaultKey = this.config.taskDefaults[taskType];
    const model = this.getModel(defaultKey);
    if (!model) {
      throw new ConfigurationError(`No model found for task type: ${taskType}`);
    }
    return model;
  }

  /**
   * Get model for a specific function
   */
  public getModelForFunction(functionName: string): ModelDefinition {
    const defaultKey = this.config.functionDefaults[functionName];
    if (!defaultKey) {
      // Fall back to task type
      const taskType = functionName.includes('video') ? 'video' : 'image';
      return this.getModelForTask(taskType);
    }
    const model = this.getModel(defaultKey);
    if (!model) {
      throw new ConfigurationError(`No model found for function: ${functionName}`);
    }
    return model;
  }

  /**
   * Get thinking budget for a model
   */
  public getThinkingBudget(modelRef: string): number | undefined {
    const model = this.getModel(modelRef);
    if (!model || !model.thinking.enabled) {
      return undefined;
    }
    return model.thinking.defaultBudget;
  }

  /**
   * Get all available models (excluding deprecated)
   */
  public getAvailableModels(): ModelDefinition[] {
    return Object.values(this.config.models).filter(m => !m.deprecated);
  }

  /**
   * Get all models including deprecated
   */
  public getAllModels(): ModelDefinition[] {
    return Object.values(this.config.models);
  }

  /**
   * Check if a model supports a specific capability
   */
  public supportsCapability(modelRef: string, capability: keyof ModelCapabilities): boolean {
    const model = this.getModel(modelRef);
    return model?.capabilities[capability] || false;
  }

  /**
   * Get model defaults for API calls
   */
  public getModelDefaults(modelRef: string): ModelDefaults | undefined {
    return this.getModel(modelRef)?.defaults;
  }

  /**
   * Check if a model is deprecated
   */
  public isDeprecated(modelRef: string): boolean {
    return this.getModel(modelRef)?.deprecated || false;
  }

  /**
   * Validate that a model reference is valid
   */
  public isValidModel(modelRef: string): boolean {
    return this.resolveModelKey(modelRef) !== undefined;
  }

  /**
   * Handle unknown models - forward compatibility
   * Returns true if the model should be allowed with defaults
   */
  public allowUnknownModel(): boolean {
    // Controlled by environment variable
    return process.env.ALLOW_UNKNOWN_MODELS === 'true';
  }

  public getConfig(): ModelsConfig {
    return this.config;
  }

  /**
   * Reload configuration (useful for testing or hot-reload scenarios)
   */
  public reloadConfig(configPath?: string): void {
    this.config = this.loadConfig(configPath);
    this.modelAliasMap.clear();
    this.buildAliasMap();
  }
}
```

### 5. Integration with BaseVisionProvider

```typescript
// src/providers/base/VisionProvider.ts (modifications)

import { ModelConfigService } from '../../services/ModelConfigService.js';

export abstract class BaseVisionProvider implements VisionProvider {
  protected imageModel: string;
  protected videoModel: string;
  protected providerName: string;
  protected configService: ConfigService;
  protected modelConfigService: ModelConfigService;

  constructor(providerName: string, imageModel: string, videoModel: string) {
    this.providerName = providerName;
    this.imageModel = imageModel;
    this.videoModel = videoModel;
    this.configService = ConfigService.getInstance();
    this.modelConfigService = ModelConfigService.getInstance();
  }

  // ... existing code ...

  /**
   * Build config object with all standard options including structured output support
   * Uses ModelConfigService for model-specific defaults and thinking budgets
   */
  protected buildConfigWithOptions(
    taskType: TaskType,
    functionName: FunctionName | undefined,
    options?: AnalysisOptions
  ): any {
    // Get the resolved model for this function
    const model = this.resolveModelForFunction(taskType, functionName);
    const modelDef = this.modelConfigService.getModel(model);

    // Use model defaults if available, otherwise fall back to resolved parameters
    const defaults = modelDef?.defaults;

    const config: any = {
      temperature: options?.temperature ?? defaults?.temperature ?? this.resolveTemperatureForFunction(taskType, functionName, undefined),
      topP: options?.topP ?? defaults?.topP ?? this.resolveTopPForFunction(taskType, functionName, undefined),
      topK: options?.topK ?? defaults?.topK ?? this.resolveTopKForFunction(taskType, functionName, undefined),
      maxOutputTokens: options?.maxTokens ?? defaults?.maxTokens ?? this.resolveMaxTokensForFunction(taskType, functionName, undefined),
      candidateCount: 1,
    };

    // Add structured output configuration if responseSchema is provided
    if (options?.responseSchema) {
      config.responseMimeType = 'application/json';
      config.responseSchema = options.responseSchema;
    }

    // Add system instruction if provided
    if (options?.systemInstruction) {
      config.systemInstruction = options.systemInstruction;
    }

    // Get thinking budget from ModelConfigService
    const thinkingBudget = this.modelConfigService.getThinkingBudget(model);
    if (thinkingBudget !== undefined) {
      config.thinkingConfig = {
        thinkingBudget: thinkingBudget,
      };
    }

    return config;
  }

  /**
   * Resolve model for a function - with ModelConfig integration
   */
  protected resolveModelForFunction(
    taskType: 'image' | 'video',
    functionName: FunctionName | undefined
  ): string {
    // Priority hierarchy:
    // 1. Environment variable override (function-specific)
    // 2. Environment variable override (task-specific)
    // 3. ModelConfig function defaults
    // 4. ModelConfig task defaults
    // 5. System defaults

    // Check environment variable overrides first
    if (functionName) {
      const envModel = this.configService.getModelForFunction(functionName);
      if (envModel) {
        // Validate the env-provided model exists
        if (this.modelConfigService.isValidModel(envModel)) {
          const resolved = this.modelConfigService.resolveModelId(envModel);
          if (resolved) return resolved;
        } else if (this.modelConfigService.allowUnknownModel()) {
          // Allow unknown models if configured
          console.error(`[BaseVisionProvider] Warning: Using unknown model from environment: ${envModel}`);
          return envModel;
        }
      }
    }

    // Check task-specific env override
    const taskEnvModel = taskType === 'image'
      ? this.configService.getConfig().IMAGE_MODEL
      : this.configService.getConfig().VIDEO_MODEL;

    if (taskEnvModel) {
      if (this.modelConfigService.isValidModel(taskEnvModel)) {
        const resolved = this.modelConfigService.resolveModelId(taskEnvModel);
        if (resolved) return resolved;
      } else if (this.modelConfigService.allowUnknownModel()) {
        console.error(`[BaseVisionProvider] Warning: Using unknown model from environment: ${taskEnvModel}`);
        return taskEnvModel;
      }
    }

    // Fall back to ModelConfig defaults
    if (functionName) {
      try {
        const modelDef = this.modelConfigService.getModelForFunction(functionName);
        return modelDef.id;
      } catch {
        // Fall through to task default
      }
    }

    const taskModel = this.modelConfigService.getModelForTask(taskType);
    return taskModel.id;
  }
}
```

---

## Solution Options Analysis

### Option 1: Quick Fix - Environment Variables Only (30 min)
**Approach:**
- Add more environment variables for thinking budgets and capabilities
- Keep hardcoded model mapping in code
- No JSON configuration file

**Pros:**
- Minimal change, fastest implementation
- No new files or services needed
- Works immediately

**Cons:**
- Still requires code changes for new models
- Scattered configuration across env vars
- No structured validation
- Difficult to manage model capabilities

**When to use:** Urgent hotfixes, temporary workarounds

---

### Option 2: Balanced Solution - JSON Config with Fallback (1.5 hours) - **RECOMMENDED**
**Approach:**
- Create `config/models.json` with full model registry
- Implement `ModelConfigService` for loading and validation
- Embedded fallback configuration for missing files
- Unknown models allowed via `ALLOW_UNKNOWN_MODELS` env var
- Integration with existing ConfigService hierarchy

**Pros:**
- Centralized model management
- Runtime validation with Zod
- Backward compatible with existing env var overrides
- Forward compatible with new models via ALLOW_UNKNOWN_MODELS
- Type-safe with TypeScript interfaces
- No code changes needed for new models in most cases
- Clear deprecation path for old models

**Cons:**
- Additional service to maintain
- File I/O on startup (mitigated by caching)

**When to use:** Production scenarios requiring flexibility without sacrificing safety

---

### Option 3: Comprehensive Refactor - Full Model Management System (4+ hours)
**Approach:**
- Dynamic model discovery from provider APIs
- Database-backed model registry
- Admin API for runtime model updates
- Complex model routing based on workload
- A/B testing support for models

**Pros:**
- Fully dynamic, no config file edits needed
- Runtime model addition/removal
- Advanced routing capabilities
- Perfect for multi-tenant scenarios

**Cons:**
- High implementation complexity
- Additional infrastructure (database)
- Overkill for current requirements
- Potential for runtime failures

**When to use:** Large-scale deployments, multi-tenant SaaS

---

## Recommendation: Option 2 (Balanced Solution)

**Rationale:**
1. **Balances flexibility with safety** - JSON config allows easy model updates without code changes, while validation ensures correctness
2. **Backward compatible** - Existing environment variable overrides continue to work
3. **Forward compatible** - Unknown models can be allowed via flag for emergency situations
4. **Low maintenance overhead** - Single JSON file, single service, clear patterns
5. **Appropriate complexity** - Matches current architecture without over-engineering

### Implementation Plan

1. **Create TypeScript interfaces** (`src/types/ModelConfig.ts`)
2. **Add Zod validation schemas** (`src/utils/validation.ts`)
3. **Create ModelConfigService** (`src/services/ModelConfigService.ts`)
4. **Update BaseVisionProvider** to use ModelConfigService
5. **Create config/models.json** with current models
6. **Update documentation** (README.md, SPEC.md)

### Migration Strategy

**Phase 1: Add service (backward compatible)**
- Add ModelConfigService alongside existing hardcoded values
- Log warnings when config differs from hardcoded defaults
- No breaking changes

**Phase 2: Switch to config-based resolution**
- Update BaseVisionProvider to use ModelConfigService
- Hardcoded values become fallback only
- Environment variables still override

**Phase 3: Cleanup**
- Remove deprecated hardcoded model logic
- Keep only essential fallbacks

### Forward Compatibility Handling

For unknown models (models not in config/models.json):

1. **Default behavior:** Reject with clear error message
2. **With ALLOW_UNKNOWN_MODELS=true:** Allow with safe defaults
   - Thinking disabled
   - Conservative token limits
   - Warning logged

This allows emergency use of new models before config is updated.

### Example Usage

```typescript
// User specifies model via environment variable
// ANALYZE_IMAGE_MODEL=gemini-2.5-pro

const provider = new GeminiProvider(config);

// Internally:
// 1. ModelConfigService resolves "gemini-2.5-pro" -> model definition
// 2. Gets actual API ID: "gemini-2.5-pro-preview-06-05"
// 3. Gets thinking budget: 128
// 4. Gets defaults: { temperature: 0.7, maxTokens: 4096 }
// 5. Provider makes API call with these settings
```

This architecture provides a solid foundation for model management while maintaining the simplicity and reliability of the current system.
