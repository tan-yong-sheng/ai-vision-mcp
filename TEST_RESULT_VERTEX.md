# AI Vision CLI Test Results (Vertex AI)

Generated: 2026-04-04T08:58:35Z

## Environment
- IMAGE_PROVIDER: vertex_ai
- VIDEO_PROVIDER: vertex_ai
- VERTEX_CLIENT_EMAIL: setai-vision-mcp-sa@fresh-sanctuary-461909-j0.iam.gserviceaccount.com
- VERTEX_PROJECT_ID: fresh-sanctuary-461909-j0
- GCS_BUCKET_NAME: ai-vision-mcp-fresh-sanctuary-461909-j0

== analyze-image url ==
Status: FAIL
Command: node /c/Users/tys/Documents/Coding/ai-vision-mcp/dist/index.js analyze-image https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=500 --prompt Describe the scene in one sentence. --max-tokens 100
Output:
    at VertexAIProvider.handleError (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:421:20)
    at VertexAIProvider.analyzeImage (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:56:24)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async analyze_image (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/tools/analyze_image.js:102:24)
    at async runAnalyzeImage (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/cli/commands/analyze-image.js:30:24)
    at async runCli (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/cli/index.js:14:13)
    at async main (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/index.js:9:9) {
  code: 'PROVIDER_ERROR',
  provider: 'vertex_ai',
  originalError: ProviderError: Failed during image analysis: {"error":{"code":429,"message":"Resource exhausted. Please try again later. Please refer to https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429 for more details.","status":"RESOURCE_EXHAUSTED"}}
      at new ProviderError (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/types/Errors.js:28:9)
      at VertexAIProvider.handleError (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:421:20)
      at VertexAIProvider.analyzeImageOnce (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:158:24)
      at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      at async RetryHandler.withRetry.maxRetries (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:43:24)
      at async RetryHandler.withRetry (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/utils/retry.js:25:32)
      at async VertexAIProvider.analyzeImage (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:42:48)
      at async analyze_image (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/tools/analyze_image.js:102:24)
      at async runAnalyzeImage (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/cli/commands/analyze-image.js:30:24)
      at async runCli (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/cli/index.js:14:13) {
    code: 'PROVIDER_ERROR',
    provider: 'vertex_ai',
    originalError: ApiError: {"error":{"code":429,"message":"Resource exhausted. Please try again later. Please refer to https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429 for more details.","status":"RESOURCE_EXHAUSTED"}}
        at throwErrorIfNotOK (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/node_modules/@google/genai/dist/node/index.mjs:11025:30)
        at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
        at async file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/node_modules/@google/genai/dist/node/index.mjs:10801:13
        at async Models.generateContent (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/node_modules/@google/genai/dist/node/index.mjs:12059:24)
        at async file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:125:24
        at async VertexAIProvider.measureAsync (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/base/VisionProvider.js:54:24)
        at async VertexAIProvider.analyzeImageOnce (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:124:52)
        at async RetryHandler.withRetry.maxRetries (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:43:24)
        at async RetryHandler.withRetry (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/utils/retry.js:25:32)
        at async VertexAIProvider.analyzeImage (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:42:48) {
      status: 429
    },
    statusCode: undefined
  },
  statusCode: undefined
}
Error: Failed during image analysis: Failed during image analysis: {"error":{"code":429,"message":"Resource exhausted. Please try again later. Please refer to https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429 for more details.","status":"RESOURCE_EXHAUSTED"}}

== analyze-image local file ==
Status: PASS
Command: node /c/Users/tys/Documents/Coding/ai-vision-mcp/dist/index.js analyze-image /tmp/tmp.TGjwszbJsg/local-image.jpg --prompt Describe the image in one sentence. --max-tokens 100
Output:
[info] server: {"msg":"Providers initialized successfully"}
[VertexAI Provider] Using service account credentials for: ai-vision-mcp-sa@fresh-sanctuary-461909-j0.iam.gserviceaccount.com
The user provided Google Cloud credentials will take precedence over the API key from the environment variable.
[VertexAI Provider] Configuration:
  - Project ID: fresh-sanctuary-461909-j0
  - Location: us-central1
  - Endpoint: https://aiplatform.googleapis.com
  - Authentication: Service Account
  - Image Model URL: https://aiplatform.googleapis.com/v1/projects/fresh-sanctuary-461909-j0/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite:generateContent
  - Video Model URL: https://aiplatform.googleapis.com/v1/projects/fresh-sanctuary-461909-j0/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite:generateContent
[warning] config: {"msg":"IMAGE_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME"}
[warning] config: {"msg":"VIDEO_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME"}
[analyze_image] Processed image source: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4gIcSUNDX1BST0ZJTEUAAQEAAAIMbGNtcwIQAABtbnRyUkdCI...
[analyze_image] Original source: C:/Users/tys/AppData/Local/Temp/tmp.TGjwszbJsg/local-image.jpg
[analyze_image] Processed source starts with data:image: true
A young woman in a white dress sits on stone steps with blurred greenery in the background.

== analyze-image base64 ==
Status: PASS
Command: node /c/Users/tys/Documents/Coding/ai-vision-mcp/dist/index.js analyze-image data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg== --prompt What color is this? --json
Output:
[info] server: {"msg":"Providers initialized successfully"}
[VertexAI Provider] Using service account credentials for: ai-vision-mcp-sa@fresh-sanctuary-461909-j0.iam.gserviceaccount.com
The user provided Google Cloud credentials will take precedence over the API key from the environment variable.
[VertexAI Provider] Configuration:
  - Project ID: fresh-sanctuary-461909-j0
  - Location: us-central1
  - Endpoint: https://aiplatform.googleapis.com
  - Authentication: Service Account
  - Image Model URL: https://aiplatform.googleapis.com/v1/projects/fresh-sanctuary-461909-j0/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite:generateContent
  - Video Model URL: https://aiplatform.googleapis.com/v1/projects/fresh-sanctuary-461909-j0/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite:generateContent
[analyze_image] Processed image source: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0g...
[analyze_image] Original source: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==
[analyze_image] Processed source starts with data:image: true
[warning] config: {"msg":"IMAGE_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME"}
[warning] config: {"msg":"VIDEO_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME"}
{
  "text": "The color in the image is **red**.",
  "metadata": {
    "model": "gemini-2.5-flash-lite",
    "provider": "vertex_ai",
    "usage": {
      "promptTokenCount": 263,
      "candidatesTokenCount": 9,
      "totalTokenCount": 272
    },
    "processingTime": 7684,
    "fileType": "image/png",
    "fileSize": 70,
    "modelVersion": "gemini-2.5-flash-lite",
    "responseId": "1NLQaanBMfXJkNAPvKjlCA"
  }
}

== compare-images two urls ==
Status: FAIL
Command: node /c/Users/tys/Documents/Coding/ai-vision-mcp/dist/index.js compare-images https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=500 https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=500 --prompt Compare these two images. --max-tokens 200
Output:
  - Endpoint: https://aiplatform.googleapis.com
  - Authentication: Service Account
  - Image Model URL: https://aiplatform.googleapis.com/v1/projects/fresh-sanctuary-461909-j0/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite:generateContent
  - Video Model URL: https://aiplatform.googleapis.com/v1/projects/fresh-sanctuary-461909-j0/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite:generateContent
[compare_images] Processing 2 images for comparison
[compare_images] Processing image 1: https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=500
[compare_images] Processing image 2: https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=500
[warning] config: {"msg":"IMAGE_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME"}
[warning] config: {"msg":"VIDEO_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME"}
[compare_images] All 2 images processed successfully
[VertexAIProvider] Comparing 2 images
[VertexAIProvider] Processing image 1: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4gIcSUNDX1BST0ZJTEUAAQEAAAIMbGNtcwIQAABtbnRyUkdCI...
[VertexAIProvider] Processing image 2: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4gIcSUNDX1BST0ZJTEUAAQEAAAIMbGNtcwIQAABtbnRyUkdCI...
Error in compare_images tool: ProviderError: Failed during image comparison: {"error":{"code":429,"message":"Resource exhausted. Please try again later. Please refer to https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429 for more details.","status":"RESOURCE_EXHAUSTED"}}
    at new ProviderError (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/types/Errors.js:28:9)
    at VertexAIProvider.handleError (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:421:20)
    at VertexAIProvider.compareImages (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:219:24)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async compare_images (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/tools/compare_images.js:46:24)
    at async runCompareImages (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/cli/commands/compare-images.js:23:24)
    at async runCli (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/cli/index.js:17:13)
    at async main (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/index.js:9:9) {
  code: 'PROVIDER_ERROR',
  provider: 'vertex_ai',
  originalError: ApiError: {"error":{"code":429,"message":"Resource exhausted. Please try again later. Please refer to https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429 for more details.","status":"RESOURCE_EXHAUSTED"}}
      at throwErrorIfNotOK (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/node_modules/@google/genai/dist/node/index.mjs:11025:30)
      at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      at async file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/node_modules/@google/genai/dist/node/index.mjs:10801:13
      at async Models.generateContent (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/node_modules/@google/genai/dist/node/index.mjs:12059:24)
      at async file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:194:24
      at async VertexAIProvider.measureAsync (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/base/VisionProvider.js:54:24)
      at async VertexAIProvider.compareImages (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:193:52)
      at async compare_images (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/tools/compare_images.js:46:24)
      at async runCompareImages (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/cli/commands/compare-images.js:23:24)
      at async runCli (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/cli/index.js:17:13) {
    status: 429
  },
  statusCode: undefined
}
Error: Failed during image comparison: {"error":{"code":429,"message":"Resource exhausted. Please try again later. Please refer to https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429 for more details.","status":"RESOURCE_EXHAUSTED"}}

== compare-images three urls ==
Status: FAIL
Command: node /c/Users/tys/Documents/Coding/ai-vision-mcp/dist/index.js compare-images https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=500 https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=500 https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg?auto=compress&cs=tinysrgb&w=500 --prompt Compare these three images. --json
Output:
[compare_images] Processing image 1: https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=500
[compare_images] Processing image 2: https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=500
[compare_images] Processing image 3: https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg?auto=compress&cs=tinysrgb&w=500
[warning] config: {"msg":"IMAGE_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME"}
[warning] config: {"msg":"VIDEO_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME"}
[compare_images] All 3 images processed successfully
[VertexAIProvider] Comparing 3 images
[VertexAIProvider] Processing image 1: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4gIcSUNDX1BST0ZJTEUAAQEAAAIMbGNtcwIQAABtbnRyUkdCI...
[VertexAIProvider] Processing image 2: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4gIcSUNDX1BST0ZJTEUAAQEAAAIMbGNtcwIQAABtbnRyUkdCI...
[VertexAIProvider] Processing image 3: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4gIcSUNDX1BST0ZJTEUAAQEAAAIMbGNtcwIQAABtbnRyUkdCI...
Error in compare_images tool: ProviderError: Failed during image comparison: {"error":{"code":429,"message":"Resource exhausted. Please try again later. Please refer to https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429 for more details.","status":"RESOURCE_EXHAUSTED"}}
    at new ProviderError (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/types/Errors.js:28:9)
    at VertexAIProvider.handleError (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:421:20)
    at VertexAIProvider.compareImages (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:219:24)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async compare_images (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/tools/compare_images.js:46:24)
    at async runCompareImages (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/cli/commands/compare-images.js:23:24)
    at async runCli (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/cli/index.js:17:13)
    at async main (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/index.js:9:9) {
  code: 'PROVIDER_ERROR',
  provider: 'vertex_ai',
  originalError: ApiError: {"error":{"code":429,"message":"Resource exhausted. Please try again later. Please refer to https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429 for more details.","status":"RESOURCE_EXHAUSTED"}}
      at throwErrorIfNotOK (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/node_modules/@google/genai/dist/node/index.mjs:11025:30)
      at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      at async file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/node_modules/@google/genai/dist/node/index.mjs:10801:13
      at async Models.generateContent (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/node_modules/@google/genai/dist/node/index.mjs:12059:24)
      at async file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:194:24
      at async VertexAIProvider.measureAsync (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/base/VisionProvider.js:54:24)
      at async VertexAIProvider.compareImages (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:193:52)
      at async compare_images (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/tools/compare_images.js:46:24)
      at async runCompareImages (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/cli/commands/compare-images.js:23:24)
      at async runCli (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/cli/index.js:17:13) {
    status: 429
  },
  statusCode: undefined
}
{
  "error": true,
  "message": "Failed during image comparison: {\"error\":{\"code\":429,\"message\":\"Resource exhausted. Please try again later. Please refer to https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429 for more details.\",\"status\":\"RESOURCE_EXHAUSTED\"}}"
}

== detect-objects url ==
Status: FAIL
Command: node /c/Users/tys/Documents/Coding/ai-vision-mcp/dist/index.js detect-objects https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=500 --prompt Detect visible objects in this image. --json
Output:
    at async detect_objects_in_image (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/tools/detect_objects_in_image.js:264:24)
    at async runDetectObjects (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/cli/commands/detect-objects.js:30:24)
    at async runCli (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/cli/index.js:20:13)
    at async main (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/index.js:9:9) {
  code: 'PROVIDER_ERROR',
  provider: 'vertex_ai',
  originalError: ProviderError: Failed during image analysis: {"error":{"code":429,"message":"Resource exhausted. Please try again later. Please refer to https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429 for more details.","status":"RESOURCE_EXHAUSTED"}}
      at new ProviderError (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/types/Errors.js:28:9)
      at VertexAIProvider.handleError (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:421:20)
      at VertexAIProvider.analyzeImageOnce (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:158:24)
      at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
      at async RetryHandler.withRetry.maxRetries (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:43:24)
      at async RetryHandler.withRetry (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/utils/retry.js:25:32)
      at async VertexAIProvider.analyzeImage (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:42:48)
      at async detect_objects_in_image (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/tools/detect_objects_in_image.js:264:24)
      at async runDetectObjects (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/cli/commands/detect-objects.js:30:24)
      at async runCli (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/cli/index.js:20:13) {
    code: 'PROVIDER_ERROR',
    provider: 'vertex_ai',
    originalError: ApiError: {"error":{"code":429,"message":"Resource exhausted. Please try again later. Please refer to https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429 for more details.","status":"RESOURCE_EXHAUSTED"}}
        at throwErrorIfNotOK (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/node_modules/@google/genai/dist/node/index.mjs:11025:30)
        at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
        at async file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/node_modules/@google/genai/dist/node/index.mjs:10801:13
        at async Models.generateContent (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/node_modules/@google/genai/dist/node/index.mjs:12059:24)
        at async file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:125:24
        at async VertexAIProvider.measureAsync (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/base/VisionProvider.js:54:24)
        at async VertexAIProvider.analyzeImageOnce (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:124:52)
        at async RetryHandler.withRetry.maxRetries (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:43:24)
        at async RetryHandler.withRetry (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/utils/retry.js:25:32)
        at async VertexAIProvider.analyzeImage (file:///C:/Users/tys/Documents/Coding/ai-vision-mcp/dist/providers/vertexai/VertexAIProvider.js:42:48) {
      status: 429
    },
    statusCode: undefined
  },
  statusCode: undefined
}
{
  "error": true,
  "message": "Failed during image analysis: Failed during image analysis: {\"error\":{\"code\":429,\"message\":\"Resource exhausted. Please try again later. Please refer to https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429 for more details.\",\"status\":\"RESOURCE_EXHAUSTED\"}}"
}

== detect-objects local file ==
Status: PASS
Command: node /c/Users/tys/Documents/Coding/ai-vision-mcp/dist/index.js detect-objects /tmp/tmp.TGjwszbJsg/local-image.jpg --prompt Detect visible objects in this image. --output /tmp/tmp.TGjwszbJsg/annotated-local-image.png
Output:
  - Image Model URL: https://aiplatform.googleapis.com/v1/projects/fresh-sanctuary-461909-j0/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite:generateContent
  - Video Model URL: https://aiplatform.googleapis.com/v1/projects/fresh-sanctuary-461909-j0/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite:generateContent
[warning] config: {"msg":"IMAGE_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME"}
[warning] config: {"msg":"VIDEO_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME"}
[detect_objects_in_image] Processed image source: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4gIcSUNDX1BST0ZJTEUAAQEAAAIMbGNtcwIQAABtbnRyUkdCI...
[detect_objects_in_image] Image size: 500x750
[detect_objects_in_image] Analyzing image for object detection...
[detect_objects_in_image] Configuration: temperature=0, topP=0.95, topK=30, maxTokens=8192
[detect_objects_in_image] Response length: 403 characters
[detect_objects_in_image] Response ends with: " [799, 230, 999, 999],
    "confidence": 0.7
  }
]"
[detect_objects_in_image] Detected 3 objects
[detect_objects_in_image] Annotated image size: 584268 bytes
[detect_objects_in_image] Generated text summary (813 characters)
[detect_objects_in_image] Annotated image saved to: C:/Users/tys/AppData/Local/Temp/tmp.TGjwszbJsg/annotated-local-image.png
IMAGE ANALYSIS COMPLETE

Source Image: 500×750 pixels (PNG, 0.0MB)
Detection Model: AI Vision Model (vertex_ai)
Elements Found: 3 elements detected

OBJECT DETECTION RESULTS:
- **SPATIAL REFERENCE**: Coordinates show relative positioning within image
- **COORDINATE FORMAT**: normalized_box_2d format [ymin, xmin, ymax, xmax] on 0-1000 scale

## DETECTED ELEMENTS:

### 1. person - woman sitting on stairs
- **Position**: 50.0% across, 50.0% down (99.9% × 99.9% size)
- **Pixels**: 500×749 at (0, 0), center (250, 375)

### 2. clothing - white dress
- **Position**: 50.0% across, 61.5% down (99.9% × 76.9% size)
- **Pixels**: 500×577 at (0, 173), center (250, 461)

### 3. clothing - white pants
- **Position**: 61.5% across, 89.9% down (76.9% × 20.0% size)
- **Pixels**: 385×150 at (115, 599), center (307, 674)

== analyze-video remote url ==
Status: PASS
Command: node /c/Users/tys/Documents/Coding/ai-vision-mcp/dist/index.js analyze-video https://www.w3schools.com/html/mov_bbb.mp4 --prompt Summarize this video in one sentence. --max-tokens 200
Output:
[info] server: {"msg":"Providers initialized successfully"}
[VertexAI Provider] Using service account credentials for: ai-vision-mcp-sa@fresh-sanctuary-461909-j0.iam.gserviceaccount.com
The user provided Google Cloud credentials will take precedence over the API key from the environment variable.
[VertexAI Provider] Configuration:
  - Project ID: fresh-sanctuary-461909-j0
  - Location: us-central1
  - Endpoint: https://aiplatform.googleapis.com
  - Authentication: Service Account
  - Image Model URL: https://aiplatform.googleapis.com/v1/projects/fresh-sanctuary-461909-j0/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite:generateContent
  - Video Model URL: https://aiplatform.googleapis.com/v1/projects/fresh-sanctuary-461909-j0/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite:generateContent
[warning] config: {"msg":"IMAGE_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME"}
[warning] config: {"msg":"VIDEO_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME"}
The video shows a fluffy, round white rabbit interacting with a butterfly and an apple in a grassy field.

== analyze-video local file ==
Status: PASS
Command: node /c/Users/tys/Documents/Coding/ai-vision-mcp/dist/index.js analyze-video /tmp/tmp.TGjwszbJsg/local-video.mp4 --prompt Summarize this local video in one sentence. --max-tokens 200
Output:
[info] server: {"msg":"Providers initialized successfully"}
[VertexAI Provider] Using service account credentials for: ai-vision-mcp-sa@fresh-sanctuary-461909-j0.iam.gserviceaccount.com
The user provided Google Cloud credentials will take precedence over the API key from the environment variable.
[VertexAI Provider] Configuration:
  - Project ID: fresh-sanctuary-461909-j0
  - Location: us-central1
  - Endpoint: https://aiplatform.googleapis.com
  - Authentication: Service Account
  - Image Model URL: https://aiplatform.googleapis.com/v1/projects/fresh-sanctuary-461909-j0/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite:generateContent
  - Video Model URL: https://aiplatform.googleapis.com/v1/projects/fresh-sanctuary-461909-j0/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite:generateContent
[warning] config: {"msg":"IMAGE_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME"}
[warning] config: {"msg":"VIDEO_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME"}
A plump white rabbit with long ears dances in a field of grass and flowers, interacting with a pink butterfly, before a red apple appears on the ground.

== analyze-video youtube ==
Status: PASS
Command: node /c/Users/tys/Documents/Coding/ai-vision-mcp/dist/index.js analyze-video https://www.youtube.com/watch?v=9hE5-98ZeCg --prompt Summarize this YouTube video in one sentence. --max-tokens 200
Output:
[info] server: {"msg":"Providers initialized successfully"}
[VertexAI Provider] Using service account credentials for: ai-vision-mcp-sa@fresh-sanctuary-461909-j0.iam.gserviceaccount.com
The user provided Google Cloud credentials will take precedence over the API key from the environment variable.
[VertexAI Provider] Configuration:
  - Project ID: fresh-sanctuary-461909-j0
  - Location: us-central1
  - Endpoint: https://aiplatform.googleapis.com
  - Authentication: Service Account
  - Image Model URL: https://aiplatform.googleapis.com/v1/projects/fresh-sanctuary-461909-j0/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite:generateContent
  - Video Model URL: https://aiplatform.googleapis.com/v1/projects/fresh-sanctuary-461909-j0/locations/us-central1/publishers/google/models/gemini-2.5-flash-lite:generateContent
[warning] config: {"msg":"IMAGE_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME"}
[warning] config: {"msg":"VIDEO_PROVIDER set to vertex_ai. Required env vars: VERTEX_CLIENT_EMAIL, VERTEX_PRIVATE_KEY, VERTEX_PROJECT_ID, GCS_BUCKET_NAME"}
This video demonstrates building AI agents with Gemini 2.0, showcasing features like multimodal live streaming and tool use, and concludes with a call to action to start building at aistudio.google.com.

## Summary
- Completed 10 CLI cases
- Passed: 6
- Failed: 4
- Failed cases:
  - analyze-image url
  - compare-images two urls
  - compare-images three urls
  - detect-objects url
- See sections above for per-case status and output
