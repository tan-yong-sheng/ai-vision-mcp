#!/usr/bin/env node

import { binaryAvailable } from "./lib/process.mjs";
import { invokeAiVisionCli, buildAuditDesignArgs, buildAnalyzeImageArgs } from "./lib/cli-invoker.mjs";
import { parseArgs, extractDesignEvalOptions, wrapUserPrompt } from "./lib/args.mjs";

const COMMAND_PROMPTS = {
  "audit-design": {
    quick: "Conduct a quick design audit focusing on Nielsen's 10 usability heuristics. Identify critical issues only.",
    standard: "Conduct a comprehensive design audit analyzing: 1) Nielsen's 10 usability heuristics, 2) WCAG 2.1 accessibility compliance, 3) Visual consistency and design tokens, 4) Component reusability and patterns. Provide findings organized by category with severity levels.",
    deep: "Conduct an exhaustive design audit analyzing: 1) Nielsen's 10 usability heuristics with detailed explanations, 2) WCAG 2.1 Level AA accessibility compliance with specific violations, 3) Visual consistency including color contrast ratios and typography, 4) Component reusability with duplication analysis, 5) Design system maturity assessment. Provide comprehensive findings with remediation guidance."
  },
  "accessibility-check": {
    "2.1-AA": "Conduct accessibility audit against WCAG 2.1 Level AA standards. Check: WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text), keyboard navigation with tab order and focus management, semantic HTML with proper heading hierarchy, ARIA patterns and landmarks, form field associations and error messages, prefers-reduced-motion compliance. Provide specific criterion violations and detailed remediation code examples.",
    "3.0-AA": "Conduct accessibility audit against WCAG 3.0 Level AA outcome-focused standards. For each issue, explain: 1) Which user outcome is affected, 2) How users with disabilities are impacted, 3) Remediation to restore outcome, 4) How to verify outcome is achieved. Focus on outcomes, not compliance checkboxes. Cover: perceivable content, operable interfaces, understandable information, robust implementation.",
    "3.0-AAA": "Conduct comprehensive accessibility audit against WCAG 3.0 Level AAA outcome-focused standards. Assess all accessibility dimensions with outcome focus: perceivable (visual, auditory, tactile), operable (keyboard, voice control, switch access), understandable (readability, navigability, predictability), robust (assistive technology compatibility). Provide specific outcome violations and interaction design remediation guidance."
  },
  "visual-consistency": {
    "inferred": "Analyze visual consistency and design tokens. Extract and catalog: color palette (primary, secondary, neutral, semantic colors), typography (font families, sizes, weights, line heights), spacing (margin, padding, gap values), shape (border radius, shadows, strokes), motion (transition durations, easing). Identify inconsistencies and deviations from inferred patterns.",
    "validated": "Validate visual consistency against design system tokens. Compare actual usage to expected values for: color palette tokens, typography tokens, spacing tokens, shape tokens, motion tokens. For each violation, provide: token name, expected value, actual value, affected elements, remediation guidance. Calculate overall consistency score."
  },
  "component-audit": "Analyze component reusability and patterns. Identify: 1) Duplicate or near-identical components, 2) Component nesting and composition patterns, 3) Prop/API consistency across similar components, 4) Naming conventions and clarity, 5) Component documentation completeness. For each finding provide: component names/selectors, issue description, reusability impact, consolidation opportunity. Calculate reusability metrics.",
  "design-debt-report": "Analyze design system adoption and design debt. Identify: 1) Custom vs system component ratio, 2) Component adoption metrics, 3) Design system maturity level (1-4), 4) Debt drivers and root causes, 5) Governance health assessment. For each custom component, explain why it was created instead of using system components. Calculate design debt score and provide strategic recommendations for improvement."
};

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
        const basePrompt = COMMAND_PROMPTS["audit-design"][depth];
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
        const promptKey = wcagVersion === "3.0" ? `3.0-${level}` : `2.1-${level}`;
        const basePrompt = COMMAND_PROMPTS["accessibility-check"][promptKey];
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
        const promptKey = options.designSystem ? "validated" : "inferred";
        const basePrompt = COMMAND_PROMPTS["visual-consistency"][promptKey];
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
        const basePrompt = COMMAND_PROMPTS["component-audit"];
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
        const basePrompt = COMMAND_PROMPTS["design-debt-report"];
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
