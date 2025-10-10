/**
 * Base vision provider interface and abstract class
 */

import type {
  VisionProvider,
  AnalysisOptions,
  AnalysisResult,
  UploadedFile,
  HealthStatus,
  ProviderCapabilities,
  ModelCapabilities,
  ProviderInfo,
} from '../../types/Providers.js';
import type { TaskType } from '../../types/Analysis.js';
import { type FunctionName } from '../../constants/FunctionNames.js';
import { ConfigService } from '../../services/ConfigService.js';

export abstract class BaseVisionProvider implements VisionProvider {
  protected imageModel: string;
  protected videoModel: string;
  protected providerName: string;
  protected configService: ConfigService;

  constructor(providerName: string, imageModel: string, videoModel: string) {
    this.providerName = providerName;
    this.imageModel = imageModel;
    this.videoModel = videoModel;
    this.configService = ConfigService.getInstance();
  }

  // Abstract methods that must be implemented by concrete providers
  abstract analyzeImage(
    imageSource: string,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<AnalysisResult>;
  abstract analyzeVideo(
    videoSource: string,
    prompt: string,
    options?: AnalysisOptions
  ): Promise<AnalysisResult>;
  abstract compareImages(
    imageSources: string[],
    prompt: string,
    options?: AnalysisOptions
  ): Promise<AnalysisResult>;
  abstract uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadedFile>;
  abstract downloadFile(fileId: string): Promise<Buffer>;
  abstract deleteFile(fileId: string): Promise<void>;
  abstract getSupportedFormats(): ProviderCapabilities;
  abstract getModelCapabilities(): ModelCapabilities;
  abstract getProviderInfo(): ProviderInfo;
  abstract healthCheck(): Promise<HealthStatus>;

  // Concrete implementations for common functionality
  setModel(imageModel: string, videoModel: string): void {
    this.imageModel = imageModel;
    this.videoModel = videoModel;
  }

  getImageModel(): string {
    return this.imageModel;
  }

  getVideoModel(): string {
    return this.videoModel;
  }

  supportsVideo(): boolean {
    const capabilities = this.getSupportedFormats();
    return capabilities.supportsVideo;
  }

  protected createAnalysisResult(
    text: string,
    model: string,
    usage?: {
      promptTokenCount: number;
      candidatesTokenCount: number;
      totalTokenCount: number;
    },
    processingTime?: number,
    fileType?: string,
    fileSize?: number,
    modelVersion?: string,
    responseId?: string
  ): AnalysisResult {
    return {
      text,
      metadata: {
        model,
        provider: this.providerName,
        usage,
        processingTime,
        fileType,
        fileSize,
        modelVersion,
        responseId,
      },
    };
  }

  protected createHealthStatus(
    status: 'healthy' | 'unhealthy' | 'degraded',
    responseTime?: number,
    message?: string
  ): HealthStatus {
    return {
      status,
      lastCheck: new Date().toISOString(),
      responseTime,
      message,
    };
  }

  protected async measureAsync<T>(
    operation: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;
    return { result, duration };
  }

  protected isValidImageFormat(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  protected isValidVideoFormat(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  protected getProviderCapabilities(): ProviderCapabilities {
    return {
      supportedImageFormats: [
        'png',
        'jpg',
        'jpeg',
        'webp',
        'gif',
        'bmp',
        'tiff',
      ],
      supportedVideoFormats: [
        'mp4',
        'mov',
        'avi',
        'mkv',
        'webm',
        'flv',
        'wmv',
        '3gp',
      ],
      maxImageSize: 20 * 1024 * 1024, // 20MB
      maxVideoSize: 2 * 1024 * 1024 * 1024, // 2GB
      maxVideoDuration: 3600, // 1 hour
      supportsVideo: true,
      supportsFileUpload: true,
    };
  }

  protected getBaseModelCapabilities(): ModelCapabilities {
    return {
      imageAnalysis: true,
      videoAnalysis: this.supportsVideo(),
      maxTokensForImage: 500, // Default, will be overridden by specific providers
      maxTokensForVideo: 2000, // Default, will be overridden by specific providers
      supportedFormats: this.getSupportedFormats().supportedImageFormats.concat(
        this.supportsVideo()
          ? this.getSupportedFormats().supportedVideoFormats
          : []
      ),
    };
  }

  protected resolveParameter(
    taskType: TaskType,
    directValue: number | undefined,
    getTaskSpecificValue: (taskType: TaskType) => number | undefined,
    getUniversalValue: () => number,
    defaultValue: number
  ): number {
    // Priority hierarchy: LLM-assigned > task-specific > universal > default
    if (directValue !== undefined) {
      return directValue;
    }

    const taskSpecificValue = getTaskSpecificValue(taskType);
    if (taskSpecificValue !== undefined) {
      return taskSpecificValue;
    }

    return getUniversalValue() || defaultValue;
  }

  protected resolveParameterWithFunction(
    taskType: TaskType,
    functionName: FunctionName | undefined,
    directValue: number | undefined,
    getFunctionSpecificValue: (
      functionName: FunctionName
    ) => number | undefined,
    getTaskSpecificValue: (taskType: TaskType) => number | undefined,
    getUniversalValue: () => number,
    defaultValue: number
  ): number {
    // Priority hierarchy: LLM-assigned > function-specific > task-specific > universal > default
    if (directValue !== undefined) {
      return directValue;
    }

    if (functionName) {
      const functionSpecificValue = getFunctionSpecificValue(functionName);
      if (functionSpecificValue !== undefined) {
        return functionSpecificValue;
      }
    }

    const taskSpecificValue = getTaskSpecificValue(taskType);
    if (taskSpecificValue !== undefined) {
      return taskSpecificValue;
    }

    return getUniversalValue() || defaultValue;
  }

  protected resolveTemperature(
    taskType: TaskType,
    directValue: number | undefined
  ): number {
    return this.resolveParameter(
      taskType,
      directValue,
      this.configService.getTemperatureForTask.bind(this.configService),
      () => this.configService.getApiConfig().temperature,
      0.8
    );
  }

  protected resolveTopP(
    taskType: TaskType,
    directValue: number | undefined
  ): number {
    return this.resolveParameter(
      taskType,
      directValue,
      this.configService.getTopPForTask.bind(this.configService),
      () => this.configService.getApiConfig().topP,
      0.95
    );
  }

  protected resolveTopK(
    taskType: TaskType,
    directValue: number | undefined
  ): number {
    return this.resolveParameter(
      taskType,
      directValue,
      this.configService.getTopKForTask.bind(this.configService),
      () => this.configService.getApiConfig().topK,
      30
    );
  }

  protected resolveMaxTokens(
    taskType: TaskType,
    directValue: number | undefined
  ): number {
    const defaultValue = taskType === 'image' ? 500 : 2000;
    return this.resolveParameter(
      taskType,
      directValue,
      this.configService.getMaxTokensForTask.bind(this.configService),
      () => this.configService.getApiConfig().maxTokens,
      defaultValue
    );
  }

  // Function-specific resolution methods
  protected resolveTemperatureForFunction(
    taskType: TaskType,
    functionName: FunctionName | undefined,
    directValue: number | undefined
  ): number {
    return this.resolveParameterWithFunction(
      taskType,
      functionName,
      directValue,
      this.configService.getTemperatureForFunction.bind(this.configService),
      this.configService.getTemperatureForTask.bind(this.configService),
      () => this.configService.getApiConfig().temperature,
      0.8
    );
  }

  protected resolveTopPForFunction(
    taskType: TaskType,
    functionName: FunctionName | undefined,
    directValue: number | undefined
  ): number {
    return this.resolveParameterWithFunction(
      taskType,
      functionName,
      directValue,
      this.configService.getTopPForFunction.bind(this.configService),
      this.configService.getTopPForTask.bind(this.configService),
      () => this.configService.getApiConfig().topP,
      0.95
    );
  }

  protected resolveTopKForFunction(
    taskType: TaskType,
    functionName: FunctionName | undefined,
    directValue: number | undefined
  ): number {
    return this.resolveParameterWithFunction(
      taskType,
      functionName,
      directValue,
      this.configService.getTopKForFunction.bind(this.configService),
      this.configService.getTopKForTask.bind(this.configService),
      () => this.configService.getApiConfig().topK,
      30
    );
  }

  protected resolveMaxTokensForFunction(
    taskType: TaskType,
    functionName: FunctionName | undefined,
    directValue: number | undefined
  ): number {
    const defaultValue = taskType === 'image' ? 500 : 2000;
    return this.resolveParameterWithFunction(
      taskType,
      functionName,
      directValue,
      this.configService.getMaxTokensForFunction.bind(this.configService),
      this.configService.getMaxTokensForTask.bind(this.configService),
      () => this.configService.getApiConfig().maxTokens,
      defaultValue
    );
  }

  /**
   * Build config object with all standard options including structured output support
   * @param taskType - 'image' or 'video'
   * @param functionName - Specific function being called (for function-specific config)
   * @param options - Analysis options from caller
   * @returns Config object ready for API call
   */
  protected buildConfigWithOptions(
    taskType: TaskType,
    functionName: FunctionName | undefined,
    options?: AnalysisOptions
  ): any {
    const config: any = {
      temperature: this.resolveTemperatureForFunction(
        taskType,
        functionName,
        options?.temperature
      ),
      topP: this.resolveTopPForFunction(taskType, functionName, options?.topP),
      topK: this.resolveTopKForFunction(taskType, functionName, options?.topK),
      maxOutputTokens: this.resolveMaxTokensForFunction(
        taskType,
        functionName,
        options?.maxTokens
      ),
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

    // Add thinking budget configuration for Gemini models
    const model = this.resolveModelForFunction(taskType, functionName);
    const thinkingBudget = this.getThinkingBudgetForModel(model);
    if (thinkingBudget !== undefined) {
      config.thinkingConfig = {
        thinkingBudget: thinkingBudget,
      };
    }

    return config;
  }

  // Function-specific model resolution methods
  protected resolveModelForFunction(
    taskType: 'image' | 'video',
    functionName: FunctionName | undefined
  ): string {
    const systemDefault =
      taskType === 'image' ? 'gemini-2.5-flash-lite' : 'gemini-2.5-flash';

    // Priority hierarchy: Function-specific > Task-specific > System default
    if (functionName) {
      const functionSpecificModel =
        this.configService.getModelForFunction(functionName);
      if (functionSpecificModel) {
        return functionSpecificModel;
      }
    }

    const taskSpecificModel = this.getModelForTask(taskType);
    if (taskSpecificModel) {
      return taskSpecificModel;
    }

    return systemDefault;
  }

  private getModelForTask(taskType: 'image' | 'video'): string | undefined {
    return taskType === 'image'
      ? this.configService.getConfig().IMAGE_MODEL
      : this.configService.getConfig().VIDEO_MODEL;
  }

  /**
   * Determine the appropriate thinking budget for Gemini model variants
   * Applies to both Gemini API and Vertex AI providers when using Gemini models
   * Based on user requirements:
   * - gemini-2.5-flash-lite and gemini-2.5-flash: thinking_budget = 0
   * - gemini-2.5-pro: thinking_budget = 128
   * - Other models: no thinking budget (undefined)
   * @param model - The model name
   * @returns thinking budget value or undefined if not applicable
   */
  protected getThinkingBudgetForModel(model: string): number | undefined {
    // Only apply thinking budget to specific Gemini model variants
    // This works for both direct Gemini API and Vertex AI when using Gemini models
    if (model.includes('gemini-2.5-flash-lite') || model.includes('gemini-2.5-flash')) {
      // For flash models, use minimal thinking budget for faster response
      return 0;
    } else if (model.includes('gemini-2.5-pro')) {
      // For pro models, use higher thinking budget for better reasoning
      return 128;
    }

    // For other models (older Gemini versions, non-Gemini models), don't set thinking budget
    return undefined;
  }
}
