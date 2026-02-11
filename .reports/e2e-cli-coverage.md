# CLI Mode E2E Test Coverage Analysis

**Date:** 2026-02-11
**Scope:** AI Vision MCP - CLI Mode Testing
**Files Analyzed:**
- `src/index.ts` - Entry point (CLI/MCP mode detection)
- `src/cli/index.ts` - CLI router and help
- `src/cli/commands/*.ts` - All 4 CLI commands
- `src/cli/utils.ts` - CLI utilities
- `tests/e2e/*.test.ts` - Existing E2E tests

---

## 1. CLI Commands Available

The CLI exposes **4 primary commands** via `src/cli/index.ts`:

| Command | Handler File | Description | Required Args | Optional Args |
|---------|-------------|-------------|---------------|---------------|
| `analyze-image` | `src/cli/commands/analyze-image.ts` | Analyze single image | `<source>`, `--prompt` | `--json`, temperature options |
| `compare-images` | `src/cli/commands/compare-images.ts` | Compare 2-4 images | `<sources...>`, `--prompt` | `--json`, temperature options |
| `detect-objects` | `src/cli/commands/detect-objects.ts` | Object detection with bounding boxes | `<source>`, `--prompt` | `--output`, `--json`, temperature options |
| `analyze-video` | `src/cli/commands/analyze-video.ts` | Analyze video content | `<source>`, `--prompt` | `--json`, temperature options |
| `help` / `--help` / `-h` | Inline in `src/cli/index.ts` | Show help text | - | - |

### Entry Point Logic (`src/index.ts:13-28`)

```typescript
const commands = ['analyze-image', 'compare-images', 'detect-objects', 'analyze-video', 'help'];
const isCliMode = args.length > 0 && commands.includes(args[0]);

if (isCliMode) {
  await runCli(args);
} else {
  await runMcpServer();
}
```

---

## 2. CLI-Specific Features

### 2.1 Argument Parsing (`src/cli/utils.ts:57-73`)

The CLI uses a **custom argument parser** that differs from MCP's Zod validation:

```typescript
export function parseArgs(args: string[]): { positional: string[]; options: Record<string, string> }
```

**Features:**
- Positional arguments (e.g., image URLs/file paths)
- Flag-style options with `--key value` format
- Supports kebab-case (`--max-tokens`) and camelCase (`--maxTokens`)

### 2.2 Global Options Supported

| Option | Alias | Type | Description |
|--------|-------|------|-------------|
| `--prompt` | - | string | Analysis prompt (required for all commands) |
| `--json` | - | boolean | Output raw JSON instead of human-readable |
| `--temperature` | - | number | Temperature 0-2 (default: 0.7) |
| `--top-p` | `--topP` | number | Top P 0-1 |
| `--top-k` | `--topK` | number | Top K 1-100 |
| `--max-tokens` | `--maxTokens` | number | Max output tokens |
| `--output` | - | string | Output file path (detect-objects only) |

### 2.3 Output Formatting (`src/cli/utils.ts:28-46`)

```typescript
export function formatOutput(
  result: AnalysisResult | ObjectDetectionResponse,
  jsonMode?: boolean
): string
```

**Two output modes:**
1. **Human-readable** (default): Returns `result.text` or `result.summary`
2. **JSON mode** (`--json`): Pretty-printed JSON with 2-space indentation

### 2.4 Error Handling (`src/cli/utils.ts:48-55`)

```typescript
export function handleError(error: unknown): never
```

- Prints error message to stderr
- Exits process with code 1
- Different formatting for Error objects vs unknown errors

### 2.5 Help Text (`src/cli/index.ts:42-68`)

Full help documentation including:
- Usage instructions
- Command descriptions
- Global options list
- Usage examples for each command

---

## 3. Current E2E Test Coverage for CLI

### 3.1 Test Files Overview

| Test File | Purpose | CLI Coverage |
|-----------|---------|--------------|
| `tests/e2e/protocol.test.ts` | MCP protocol compliance | **NONE** - MCP only |
| `tests/e2e/validation.test.ts` | Input validation | **NONE** - MCP only |
| `tests/e2e/integration.test.ts` | Real API integration | **NONE** - MCP only |
| `tests/e2e/setup.ts` | Test harness utilities | **NONE** - MCP client only |

### 3.2 Verdict: **ZERO CLI E2E Tests**

All existing E2E tests use the MCP client SDK to communicate with the server:

```typescript
// From tests/e2e/setup.ts - ALL tests use this pattern
const transport = new StdioClientTransport({
  command: 'node',
  args: [serverPath],  // Starts in MCP mode (no CLI args)
  env,
});

const client = new Client({...}, {...});
await client.connect(transport);
```

**The tests spawn the process WITHOUT CLI arguments**, which triggers MCP mode (see `src/index.ts:19-20` logic).

---

## 4. Coverage Gap Analysis

### 4.1 Critical CLI Paths NOT Tested

| Category | Specific Gap | Risk Level |
|----------|-------------|------------|
| **Entry Point** | Mode detection logic (`isCliMode`) | HIGH |
| **Entry Point** | Unknown command handling | MEDIUM |
| **Argument Parsing** | `parseArgs()` function | HIGH |
| **Argument Parsing** | Flag value extraction | MEDIUM |
| **Argument Parsing** | Kebab-case vs camelCase handling | LOW |
| **Commands** | `analyze-image` command execution | HIGH |
| **Commands** | `compare-images` command execution | HIGH |
| **Commands** | `detect-objects` command execution | HIGH |
| **Commands** | `analyze-video` command execution | HIGH |
| **Commands** | Missing required arguments | HIGH |
| **Output** | Human-readable formatting | MEDIUM |
| **Output** | JSON mode (`--json` flag) | HIGH |
| **Output** | Error output formatting | MEDIUM |
| **Help** | Help text display | LOW |
| **Exit Codes** | Success (0) vs failure (1) | MEDIUM |

### 4.2 CLI-Specific Code NOT Covered by MCP Tests

The following code in `src/cli/` is **NOT exercised** by any E2E tests:

**`src/cli/index.ts`:**
- Line 17: Command routing switch statement
- Lines 30-34: Help command handling
- Lines 35-39: Unknown command error handling
- Lines 42-68: Help text generation

**`src/cli/utils.ts`:**
- Lines 4-26: `parseOptions()` - CLI option parsing
- Lines 28-46: `formatOutput()` - Human-readable formatting
- Lines 48-55: `handleError()` - CLI error handling
- Lines 57-73: `parseArgs()` - Argument parsing logic

**`src/cli/commands/*.ts` (all 4 files):**
- Argument validation (different from MCP Zod validation)
- Service initialization for CLI context
- Process.exit() calls

---

## 5. CLI Scenarios That Need Testing

### 5.1 Basic Command Execution

```bash
# Each command should be tested with valid inputs
ai-vision analyze-image <source> --prompt "describe"
ai-vision compare-images <src1> <src2> --prompt "compare"
ai-vision detect-objects <source> --prompt "find cars"
ai-vision analyze-video <source> --prompt "summarize"
```

### 5.2 Argument Validation

```bash
# Missing required arguments
ai-vision analyze-image                    # Missing source
ai-vision analyze-image image.jpg          # Missing --prompt
ai-vision compare-images image1.jpg        # Missing 2nd source
ai-vision compare-images --prompt "test"   # Missing all sources

# Invalid argument formats
ai-vision analyze-image not-a-url --prompt "test"
ai-vision analyze-image image.jpg --prompt ""  # Empty prompt
```

### 5.3 Option Parsing

```bash
# All option formats
ai-vision analyze-image img.jpg --prompt "test" --json
ai-vision analyze-image img.jpg --prompt "test" --temperature 0.5
ai-vision analyze-image img.jpg --prompt "test" --top-p 0.9
ai-vision analyze-image img.jpg --prompt "test" --top-k 40
ai-vision analyze-image img.jpg --prompt "test" --max-tokens 500
ai-vision analyze-image img.jpg --prompt "test" --maxTokens 500  # camelCase

# detect-objects --output
ai-vision detect-objects img.jpg --prompt "test" --output result.jpg
```

### 5.4 Output Format Testing

```bash
# Human-readable output (default)
ai-vision analyze-image img.jpg --prompt "describe"

# JSON output
ai-vision analyze-image img.jpg --prompt "describe" --json

# Error output (should go to stderr)
ai-vision analyze-image invalid.jpg --prompt "describe"
```

### 5.5 Help and Unknown Commands

```bash
# Help variations
ai-vision help
ai-vision --help
ai-vision -h

# Unknown command
ai-vision invalid-command
```

### 5.6 Exit Code Verification

| Scenario | Expected Exit Code |
|----------|-------------------|
| Successful execution | 0 |
| Missing required arg | 1 |
| Invalid source | 1 |
| API error | 1 |
| Unknown command | 1 |

---

## 6. Architecture Note

Per `CLAUDE.md`, the CLI and MCP modes **share the same business logic** via tool functions in `src/tools/`:

```
CLI Mode (src/cli/) ──┐
                      ├─► src/tools/*.ts (business logic)
MCP Mode (src/server.ts) ──┘
```

**Important:** While the tool functions are tested via MCP integration tests, the **CLI wrapper layer** (argument parsing, output formatting, exit handling) is completely untested.

---

## 7. Recommendations

### Priority 1: Critical CLI Tests

1. **Mode detection test** - Verify CLI args trigger CLI mode, not MCP
2. **Argument parsing tests** - Cover `parseArgs()` and `parseOptions()`
3. **Command execution tests** - Each of 4 commands with mocked providers
4. **Missing argument validation** - Each command's required arg checks

### Priority 2: Output Format Tests

1. **JSON output mode** - Verify `--json` produces valid JSON
2. **Human-readable output** - Verify text extraction from results
3. **Error formatting** - Verify stderr output and exit codes

### Priority 3: Edge Cases

1. **Help command** - Verify help text display
2. **Unknown commands** - Verify error handling
3. **Option aliases** - Test kebab-case vs camelCase

---

## 8. Summary

| Metric | Value |
|--------|-------|
| CLI Commands | 4 (+ help) |
| CLI-Specific Source Files | 6 files in `src/cli/` |
| CLI Lines of Code | ~250 lines |
| Existing CLI E2E Tests | **0** |
| CLI Test Coverage | **0%** |

**Bottom Line:** The CLI mode has **no E2E test coverage**. All existing E2E tests exercise MCP mode only. The CLI layer (argument parsing, output formatting, exit handling) is a completely untested code path.
