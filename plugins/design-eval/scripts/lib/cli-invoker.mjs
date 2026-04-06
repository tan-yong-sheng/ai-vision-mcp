import { spawn } from "node:child_process";

/**
 * Invoke ai-vision CLI with arguments
 * @param {string[]} args - CLI arguments
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export async function invokeAiVisionCli(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ai-vision", args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: true
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      resolve({ stdout, stderr, code });
    });

    proc.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Build ai-vision CLI arguments for a design audit
 * @param {Object} options - Options object
 * @returns {string[]} CLI arguments
 */
export function buildAuditDesignArgs(options) {
  const args = ["audit-design", options.imageSource];

  if (options.prompt) {
    args.push("--prompt", options.prompt);
  }

  if (options.temperature !== undefined) {
    args.push("--temperature", String(options.temperature));
  }

  if (options.topP !== undefined) {
    args.push("--top-p", String(options.topP));
  }

  if (options.topK !== undefined) {
    args.push("--top-k", String(options.topK));
  }

  if (options.maxTokens !== undefined) {
    args.push("--max-tokens", String(options.maxTokens));
  }

  if (options.json) {
    args.push("--json");
  }

  return args;
}

/**
 * Build ai-vision CLI arguments for image analysis
 * @param {Object} options - Options object
 * @returns {string[]} CLI arguments
 */
/**
 * Build ai-vision CLI arguments for image comparison
 * @param {Object} options - Options object
 * @returns {string[]} CLI arguments
 */
export function buildCompareImagesArgs(options) {
  const args = ["compare-images", options.baseline, options.current];

  if (options.prompt) {
    args.push("--prompt", options.prompt);
  }

  if (options.temperature !== undefined) {
    args.push("--temperature", String(options.temperature));
  }

  if (options.topP !== undefined) {
    args.push("--top-p", String(options.topP));
  }

  if (options.topK !== undefined) {
    args.push("--top-k", String(options.topK));
  }

  if (options.maxTokens !== undefined) {
    args.push("--max-tokens", String(options.maxTokens));
  }

  if (options.json) {
    args.push("--json");
  }

  return args;
}

