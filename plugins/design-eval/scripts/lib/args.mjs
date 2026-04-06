/**
 * Parse command-line arguments into options object
 * @param {string[]} argv - Raw argument array (e.g., from process.argv.slice(2))
 * @returns {Object} Parsed arguments {flags: {}, values: {}}
 */
export function parseArgs(argv) {
  const flags = {};
  const values = {};
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const nextArg = argv[i + 1];

      // Check if next arg is a value (doesn't start with --)
      if (nextArg && !nextArg.startsWith("--")) {
        values[key] = nextArg;
        i++; // Skip next iteration
      } else {
        // Boolean flag
        flags[key] = true;
      }
    } else if (arg.startsWith("-")) {
      // Short flag (not used in design-eval, but handle for completeness)
      flags[arg.slice(1)] = true;
    } else {
      // Positional argument
      positional.push(arg);
    }
  }

  return { flags, values, positional };
}

/**
 * Extract design-eval specific options from parsed args
 * @param {Object} parsed - Parsed arguments from parseArgs()
 * @returns {Object} Design-eval options
 */
export function extractDesignEvalOptions(parsed) {
  return {
    imageSource: parsed.values.imageSource,
    baseline: parsed.values.baseline,
    current: parsed.values.current,
    mode: parsed.values.mode,
    userPrompt: parsed.values.userPrompt,
    temperature: parsed.values.temperature ? parseFloat(parsed.values.temperature) : undefined,
    topP: parsed.values["top-p"] ? parseFloat(parsed.values["top-p"]) : undefined,
    topK: parsed.values["top-k"] ? parseInt(parsed.values["top-k"], 10) : undefined,
    maxTokens: parsed.values["max-tokens"] ? parseInt(parsed.values["max-tokens"], 10) : undefined,
    depth: parsed.values.depth || "standard",
    level: parsed.values.level || "AA",
    wcagVersion: parsed.values["wcag-version"] || "2.1",
    designSystem: parsed.values["design-system"],
    scope: parsed.values.scope,
    threshold: parsed.values.threshold ? parseInt(parsed.values.threshold, 10) : 30
  };
}

/**
 * Build depth-based prompt with user prompt wrapping
 * @param {string} basePrompt - Base prompt template
 * @param {string|undefined} userPrompt - User-provided additional focus
 * @returns {string} Final prompt
 */
export function wrapUserPrompt(basePrompt, userPrompt) {
  if (!userPrompt) {
    return basePrompt;
  }
  return `${basePrompt}\n\nADDITIONAL FOCUS: ${userPrompt}`;
}
