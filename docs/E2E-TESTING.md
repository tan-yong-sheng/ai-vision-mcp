# E2E Testing Guide

This document explains how E2E tests are configured in GitHub Actions and how to trigger them.

## Overview

The E2E test suite is split into two categories:

1. **Fast Tests (Always Run)** - Protocol & Validation tests
   - No API calls required
   - Run on every PR and push
   - Complete in ~2 minutes

2. **API Tests (Conditional)** - CLI & Integration tests
   - Require real API keys
   - Only run when explicitly triggered
   - Complete in ~5-10 minutes

## How to Trigger API Tests

### Option 1: Add Label to PR (Recommended)

Add the `e2e-tests` label to your PR:

```bash
# Via GitHub CLI
gh pr edit <PR_NUMBER> --add-label "e2e-tests"

# Or via GitHub web interface
# PR page → Labels → Add 'e2e-tests'
```

The tests will re-run automatically when you add the label.

### Option 2: Include in Commit Message

Include `[e2e]` in your commit message:

```bash
git commit -m "Fix image analysis [e2e]"
git push
```

### Option 3: Manual Trigger

1. Go to **Actions** tab in GitHub
2. Select **E2E Tests** workflow
3. Click **Run workflow**
4. Choose which tests to run:
   - ☑ Run CLI E2E tests
   - ☑ Run Integration tests
5. Click **Run workflow**

### Option 4: Push to Main with CLI Changes

API tests automatically run when pushing to `main` branch if files in these directories change:
- `src/cli/`
- `src/tools/`
- `tests/e2e/`

## Required Secrets

Configure these secrets in your GitHub repository:

| Secret | Description | Required For |
|--------|-------------|--------------|
| `GEMINI_API_KEY` | Your Gemini API key | CLI & Integration tests |
| `GEMINI_BASE_URL` | Custom proxy URL (optional) | CLI & Integration tests |
| `IMAGE_MODEL` | Model for image analysis (default: `gemini-2.0-flash-lite`) | CLI & Integration tests |
| `VIDEO_MODEL` | Model for video analysis (default: `gemini-2.0-flash-lite`) | CLI & Integration tests |

### Setting Up Secrets

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add each secret:
   - Name: `GEMINI_API_KEY`
   - Value: Your actual API key
4. Repeat for other secrets

## Workflow Behavior

### On Pull Request (without label)
```
✅ Protocol & Validation Tests  → Run
⏭️ CLI E2E Tests               → Skip
⏭️ Integration Tests           → Skip
```

### On Pull Request (with `e2e-tests` label)
```
✅ Protocol & Validation Tests  → Run
✅ CLI E2E Tests               → Run
✅ Integration Tests           → Run
```

### On Manual Trigger
```
✅ Protocol & Validation Tests  → Run
☑ CLI E2E Tests               → Configurable
☑ Integration Tests           → Configurable
```

## Local Testing

Before pushing, you can run E2E tests locally:

```bash
# Protocol & Validation (fast, no API)
npm run test:e2e:protocol

# All E2E tests (requires API key)
GEMINI_API_KEY=your_key npm run test:e2e

# CLI tests only
GEMINI_API_KEY=your_key npm run test:e2e:cli

# Integration tests only
GEMINI_API_KEY=your_key npx vitest run tests/e2e/integration.test.ts
```

## Cost Considerations

Each API test run consumes quota:
- **Protocol/Validation**: 0 API calls (always run)
- **CLI E2E**: ~15-20 API calls per run
- **Integration**: ~6-10 API calls per run

**Tips to save costs:**
1. Use `gemini-2.0-flash-lite` model (cheapest)
2. Don't add `e2e-tests` label until ready for final review
3. Use commit message `[e2e]` only when needed
4. Run manual workflow with only CLI or only Integration

## Troubleshooting

### Tests are skipped but I want to run them

Add the `e2e-tests` label to your PR or include `[e2e]` in your commit message.

### API tests fail with "Invalid API key"

Check that:
1. `GEMINI_API_KEY` secret is set in repository settings
2. The API key is valid and has quota remaining
3. `GEMINI_BASE_URL` is correct (if using custom proxy)

### Tests timeout

Increase timeout in workflow or locally:
```bash
# Local with longer timeout
npx vitest run tests/e2e/cli.test.ts --testTimeout=120000
```

## Workflow File

The workflow is defined in `.github/workflows/e2e-tests.yml`.

To modify behavior:
1. Edit the workflow file
2. The `check-api-tests` job determines if API tests run
3. Add new conditions in the `Check conditions` step

## Summary Table

| Trigger | Protocol | CLI | Integration |
|---------|----------|-----|-------------|
| PR without label | ✅ | ⏭️ | ⏭️ |
| PR with `e2e-tests` label | ✅ | ✅ | ✅ |
| Commit with `[e2e]` | ✅ | ✅ | ✅ |
| Manual trigger | ✅ | ☑ | ☑ |
| Push to main (CLI changes) | ✅ | ✅ | ✅ |
| Push to main (other) | ✅ | ⏭️ | ⏭️ |
