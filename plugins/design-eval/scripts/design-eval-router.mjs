#!/usr/bin/env node

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { binaryAvailable } from "./lib/process.mjs";
import { invokeAiVisionCli, buildAuditDesignArgs, buildAnalyzeImageArgs, buildCompareImagesArgs } from "./lib/cli-invoker.mjs";
import { parseArgs, extractDesignEvalOptions, wrapUserPrompt } from "./lib/args.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const promptsDir = join(__dirname, "../prompts");

function loadPromptFile(filename) {
  const path = join(promptsDir, filename);
  return readFileSync(path, "utf-8");
}

function extractPromptSection(content, sectionName) {
  const lines = content.split("\n");
  let inSection = false;
  let sectionContent = [];

  for (const line of lines) {
    if (line.startsWith(`## ${sectionName}`)) {
      inSection = true;
      continue;
    }
    if (inSection && line.startsWith("##")) {
      break;
    }
    if (inSection) {
      sectionContent.push(line);
    }
  }

  return sectionContent.join("\n").trim();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Error: No command specified");
    console.error("Usage: node design-eval-router.mjs <command> [options]");
    process.exit(1);
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  // Check if ai-vision CLI is available
  if (!binaryAvailable("ai-vision")) {
    console.error("Error: ai-vision CLI not found");
    console.error("Install with: npm install -g ai-vision-mcp");
    process.exit(1);
  }

  try {
    const parsed = parseArgs(commandArgs);
    const options = extractDesignEvalOptions(parsed);

    let prompt;
    let cliArgs;

    switch (command) {
      case "audit-design": {
        const depth = options.depth || "standard";
        const auditDesignContent = loadPromptFile("audit-design.md");
        const depthCapitalized = depth.charAt(0).toUpperCase() + depth.slice(1);
        let sectionName;
        if (depthCapitalized === "Quick") {
          sectionName = "Quick (Fast Assessment)";
        } else if (depthCapitalized === "Standard") {
          sectionName = "Standard (Comprehensive)";
        } else if (depthCapitalized === "Deep") {
          sectionName = "Deep (Exhaustive)";
        }
        const basePrompt = extractPromptSection(auditDesignContent, sectionName);
        prompt = wrapUserPrompt(basePrompt, options.userPrompt);
        cliArgs = buildAuditDesignArgs({
          imageSource: options.imageSource,
          prompt,
          temperature: options.temperature,
          topP: options.topP,
          topK: options.topK,
          maxTokens: options.maxTokens || 2000,
          json: true
        });
        break;
      }

      case "accessibility-check": {
        const wcagVersion = options.wcagVersion || "2.1";
        const level = options.level || "AA";
        const a11yContent = loadPromptFile("check-accessibility.md");
        const sectionName = wcagVersion === "3.0" ? `WCAG 3.0 Level ${level}` : `WCAG 2.1 Level ${level}`;
        const basePrompt = extractPromptSection(a11yContent, sectionName);
        prompt = wrapUserPrompt(basePrompt, options.userPrompt);
        cliArgs = buildAuditDesignArgs({
          imageSource: options.imageSource,
          prompt,
          temperature: options.temperature,
          topP: options.topP,
          topK: options.topK,
          maxTokens: options.maxTokens || 2500,
          json: true
        });
        break;
      }

      case "visual-consistency": {
        // Explicit mode parameter: token-compliance or regression
        const mode = options.mode || "token-compliance"; // Default to token-compliance

        if (!["token-compliance", "regression"].includes(mode)) {
          console.error(`Error: Invalid mode "${mode}". Allowed modes: token-compliance, regression`);
          process.exit(1);
        }

        // Validate arguments based on mode
        if (mode === "token-compliance") {
          if (!options.imageSource) {
            console.error("Error: --imageSource is required for token-compliance mode");
            process.exit(1);
          }
          if (options.baseline || options.current) {
            console.error("Error: --baseline and --current are not allowed in token-compliance mode. Use --imageSource instead");
            process.exit(1);
          }
        } else if (mode === "regression") {
          if (!options.baseline || !options.current) {
            console.error("Error: --baseline and --current are required for regression mode");
            process.exit(1);
          }
          if (options.imageSource) {
            console.error("Error: --imageSource is not allowed in regression mode. Use --baseline and --current instead");
            process.exit(1);
          }
        }

        const visualContent = loadPromptFile("validate-visual-consistency.md");
        let prompt;
        let cliArgs;

        if (mode === "token-compliance") {
          // Mode 1: Token compliance (single image)
          const promptKey = options.designSystem ? "Validated" : "Inferred";
          const sectionName = promptKey === "Validated" ? "Validated (Against Design System)" : "Inferred (Auto-Discovery)";
          const basePrompt = extractPromptSection(visualContent, sectionName);
          prompt = wrapUserPrompt(basePrompt, options.userPrompt);
          cliArgs = buildAuditDesignArgs({
            imageSource: options.imageSource,
            prompt,
            temperature: options.temperature,
            topP: options.topP,
            topK: options.topK,
            maxTokens: options.maxTokens || 2000,
            json: true
          });
        } else {
          // Mode 2: Visual regression (two images)
          const basePrompt = extractPromptSection(visualContent, "Regression (Baseline vs Current)");
          prompt = wrapUserPrompt(basePrompt, options.userPrompt);
          cliArgs = buildCompareImagesArgs({
            baseline: options.baseline,
            current: options.current,
            prompt,
            temperature: options.temperature,
            topP: options.topP,
            topK: options.topK,
            maxTokens: options.maxTokens || 2000,
            json: true
          });
        }
        break;
      }

      case "component-audit": {
        const componentContent = loadPromptFile("audit-components.md");
        const basePrompt = componentContent.split("\n").slice(1).join("\n").trim();
        prompt = wrapUserPrompt(basePrompt, options.userPrompt);
        cliArgs = buildAnalyzeImageArgs({
          imageSource: options.imageSource,
          prompt,
          temperature: options.temperature,
          topP: options.topP,
          topK: options.topK,
          maxTokens: options.maxTokens || 2500,
          json: true
        });
        break;
      }

      case "design-debt-report": {
        const debtContent = loadPromptFile("report-design-debt.md");
        const basePrompt = debtContent.split("\n").slice(1).join("\n").trim();
        prompt = wrapUserPrompt(basePrompt, options.userPrompt);
        cliArgs = buildAnalyzeImageArgs({
          imageSource: options.imageSource,
          prompt,
          temperature: options.temperature,
          topP: options.topP,
          topK: options.topK,
          maxTokens: options.maxTokens || 2500,
          json: true
        });
        break;
      }

      default:
        console.error(`Error: Unknown command '${command}'`);
        console.error("Available commands: audit-design, accessibility-check, visual-consistency, component-audit, design-debt-report");
        process.exit(1);
    }

    // Invoke ai-vision CLI
    const result = await invokeAiVisionCli(cliArgs);

    if (result.code !== 0) {
      console.error(result.stderr);
      process.exit(result.code);
    }

    // Return output verbatim
    process.stdout.write(result.stdout);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
