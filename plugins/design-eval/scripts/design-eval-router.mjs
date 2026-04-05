#!/usr/bin/env node

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { binaryAvailable } from "./lib/process.mjs";
import { invokeAiVisionCli, buildAuditDesignArgs, buildAnalyzeImageArgs } from "./lib/cli-invoker.mjs";
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

    if (!options.imageSource) {
      console.error("Error: --imageSource is required");
      process.exit(1);
    }

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
        const a11yContent = loadPromptFile("accessibility-check.md");
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
        const promptKey = options.designSystem ? "Validated" : "Inferred";
        const visualContent = loadPromptFile("visual-consistency.md");
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
        break;
      }

      case "component-audit": {
        const componentContent = loadPromptFile("component-audit.md");
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
        const debtContent = loadPromptFile("design-debt-report.md");
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
