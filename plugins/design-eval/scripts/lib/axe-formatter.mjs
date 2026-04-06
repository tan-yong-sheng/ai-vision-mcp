import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { tmpdir } from "os";

/**
 * Format axe-core findings into markdown report
 * @param {Object} axeResults - Results from axe-runner
 * @returns {string} Markdown formatted report
 */
export function formatAxeToMarkdown(axeResults) {
  const { url, timestamp, violations, summary } = axeResults;

  let markdown = `# Accessibility Audit Report (Axe-Core)\n\n`;
  markdown += `**URL:** ${url}\n`;
  markdown += `**Scan Date:** ${new Date(timestamp).toLocaleString()}\n\n`;

  // Summary section
  markdown += `## Executive Summary\n\n`;
  markdown += `| Severity | Count |\n`;
  markdown += `|----------|-------|\n`;
  markdown += `| 🔴 Critical | ${summary.critical} |\n`;
  markdown += `| 🟠 Serious | ${summary.serious} |\n`;
  markdown += `| 🟡 Moderate | ${summary.moderate} |\n`;
  markdown += `| 🔵 Minor | ${summary.minor} |\n`;
  markdown += `| **Total** | **${summary.total_violations}** |\n\n`;

  // Findings by severity
  const severities = [
    { level: "Critical", key: "critical", emoji: "🔴" },
    { level: "Serious", key: "serious", emoji: "🟠" },
    { level: "Moderate", key: "moderate", emoji: "🟡" },
    { level: "Minor", key: "minor", emoji: "🔵" }
  ];

  for (const { level, key, emoji } of severities) {
    const severityViolations = violations.filter(v => v.impact === key);

    if (severityViolations.length === 0) continue;

    markdown += `## ${emoji} ${level} Issues (${severityViolations.length})\n\n`;

    for (const violation of severityViolations) {
      markdown += `### ${violation.id}\n\n`;
      markdown += `**Issue:** ${violation.description}\n\n`;
      markdown += `**WCAG:** ${violation.tags.join(", ")}\n\n`;
      markdown += `**Affected Elements:** ${violation.nodes.length}\n\n`;

      // Show affected elements
      if (violation.nodes.length > 0 && violation.nodes.length <= 5) {
        markdown += `**Details:**\n`;
        for (const node of violation.nodes) {
          markdown += `- \`${node.html}\`\n`;
        }
        markdown += `\n`;
      } else if (violation.nodes.length > 5) {
        markdown += `**Details:** ${violation.nodes.length} elements affected (showing first 5)\n`;
        for (const node of violation.nodes.slice(0, 5)) {
          markdown += `- \`${node.html}\`\n`;
        }
        markdown += `\n`;
      }

      markdown += `**Fix:** ${violation.help}\n\n`;
      markdown += `[More Info](${violation.helpUrl})\n\n`;
      markdown += `---\n\n`;
    }
  }

  return markdown;
}

/**
 * Save axe findings to files
 * @param {Object} axeResults - Results from axe-runner
 * @returns {Object} Paths to saved files
 */
export function saveAxeResults(axeResults) {
  // Create temp directory
  const auditDir = join(tmpdir(), "a11y-audit");
  mkdirSync(auditDir, { recursive: true });

  // Save markdown report
  const markdownPath = join(auditDir, "ACCESSIBILITY_AUDIT_REPORT_AXE.md");
  const markdown = formatAxeToMarkdown(axeResults);
  writeFileSync(markdownPath, markdown, "utf-8");

  // Save JSON findings
  const jsonPath = join(auditDir, "accessibility_findings_axe.json");
  writeFileSync(jsonPath, JSON.stringify(axeResults, null, 2), "utf-8");

  console.log(`\n📋 Audit files saved to:\n`);
  console.log(`   📄 Markdown: ${markdownPath}`);
  console.log(`   📊 JSON: ${jsonPath}\n`);

  return { markdownPath, jsonPath, auditDir };
}

/**
 * Convert axe findings into context for ai-vision
 * Summarizes violations for use in ai-vision prompt
 * @param {Object} axeResults - Results from axe-runner
 * @returns {string} Summary text for ai-vision prompt
 */
export function axeFindingsToPromptContext(axeResults) {
  const { violations, summary } = axeResults;

  let context = `## Automated Accessibility Issues (from axe-core)\n\n`;
  context += `Total violations: ${summary.total_violations}\n`;
  context += `- Critical: ${summary.critical}\n`;
  context += `- Serious: ${summary.serious}\n`;
  context += `- Moderate: ${summary.moderate}\n`;
  context += `- Minor: ${summary.minor}\n\n`;

  context += `### Top Issues to Address:\n\n`;

  // Group by impact and list top issues
  const critical = violations.filter(v => v.impact === "critical").slice(0, 3);
  const serious = violations.filter(v => v.impact === "serious").slice(0, 3);

  if (critical.length > 0) {
    context += `**Critical Issues:**\n`;
    for (const issue of critical) {
      context += `- ${issue.id}: ${issue.description} (affects ${issue.nodes.length} elements)\n`;
    }
    context += `\n`;
  }

  if (serious.length > 0) {
    context += `**Serious Issues:**\n`;
    for (const issue of serious) {
      context += `- ${issue.id}: ${issue.description} (affects ${issue.nodes.length} elements)\n`;
    }
    context += `\n`;
  }

  context += `Please provide deeper analysis and remediation guidance for these automated findings.\n`;

  return context;
}
